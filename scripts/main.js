const pdfFileInput = document.querySelector("#pdfFileInput");
const outroProgress = document.querySelector("#progressBar");
const progressBar = document.querySelector("#progressBar .progress");
const textoElemento = document.querySelector("#texto");
const dropArea = document.querySelector(".drop-area");

pdfFileInput.addEventListener("change", function(event) {
  handleFileSelection(event.target.files[0]);
});

// Arrastar e Soltar Arquivo
['dragenter', 'dragover', 'dragleave'].forEach(eventName => {
  dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(event) {
  event.preventDefault();
  event.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
  document.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
  document.addEventListener(eventName, unhighlight, false);
});

function highlight() {
  dropArea.classList.add('highlight');
}

function unhighlight() {
  dropArea.classList.remove('highlight');
}

document.addEventListener('drop', handleDrop, false);

function handleDrop(event) {
  event.preventDefault();
  event.stopPropagation();

  handleFileSelection(event.dataTransfer.files[0]);
}

function handleFileSelection(file) {
  if (!file || !file.type.includes('pdf')) {
    console.error('Por favor, selecione um arquivo PDF.');
    return;
  }

  pdfFileInput.style.display = "none";
  label.style.display = "none";
  outroProgress.style.display = "block";
  textoElemento.textContent = "Arquivo selecionado! Aguarde enquanto fazemos a conversão.";
  dropArea.style.display = "none";

  converterPDFParaImagens(file)
    .then(function(zipContent) {
      const pdfFileName = file.name.replace(/\.[^/.]+$/, "");
      const url = URL.createObjectURL(zipContent);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${pdfFileName}.zip`;
      a.click();
      setTimeout(function() {
        URL.revokeObjectURL(url);
      }, 100);

      resetElements();
    })
    .catch(function(error) {
      console.error(error);
      resetElements();
    });
}

function resetElements() {
  pdfFileInput.value = null;
  label.style.display = "inline-block";
  outroProgress.style.display = "none";
  
  function checkWindowSize() {
    var windowWidth = window.innerWidth;
    console.log(windowWidth);
    if (windowWidth <= 660) {
      dropArea.style.display = "none";
      console.log("if");
    } else {
      dropArea.style.display = "block";
      console.log("else");
    }
  }

  checkWindowSize();
}

//------------------------------------------------------------------------------------------------------------
function converterPDFParaImagens(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function() {
      const typedArray = new Uint8Array(this.result);

      pdfjsLib.getDocument(typedArray).promise.then(function(pdf) {
        const totalPaginas = pdf.numPages;
        const zip = new JSZip();

        function converterPagina(pageIndex) {
          if (pageIndex >= totalPaginas) {
            zip.generateAsync({ type: "blob" }).then(function(content) {
              resolve(content);
            });
            return;
          }

          pdf.getPage(pageIndex + 1).then(function(page) {
            const scale = 2;
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const renderContext = {
              canvasContext: context,
              viewport: viewport
            };

            page.render(renderContext).promise.then(function() {
              const imageData = canvas.toDataURL("image/png");
              zip.file(`pagina_${pageIndex + 1}.png`, imageData.substr(imageData.indexOf(',') + 1), { base64: true });

              const progressoAtual = pageIndex + 1;
              const progressoTotal = (progressoAtual / totalPaginas) * 100;
              progressBar.style.width = progressoTotal + "%";
              textoElemento.textContent = `Conversão em andamento: ${progressoTotal.toFixed(0)}%`;

              if (progressoTotal === 100) {
                textoElemento.textContent = `Conversão completa!`;
              }

              converterPagina(pageIndex + 1);
            });
          });
        }

        converterPagina(0);
      });
    };

    reader.onerror = function() {
      reject(new Error('Falha ao ler o arquivo.'));
    };

    reader.readAsArrayBuffer(file);
  });
}