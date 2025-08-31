document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('generator-form');
    const promptInput = document.getElementById('prompt-input');
    const generateBtn = document.getElementById('generate-btn');
    const messageArea = document.getElementById('message-area');
    const modelViewer = document.getElementById('model-viewer');
    const downloadContainer = document.getElementById('download-buttons');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const prompt = promptInput.value.trim();

        if (!prompt) {
            showMessage('Please enter a prompt.', 'error');
            return;
        }

        // Reset UI
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';
        modelViewer.classList.add('hidden');
        downloadContainer.classList.add('hidden');
        downloadContainer.innerHTML = ''; // Clear previous buttons
        showMessage('Sending request... This might take a few minutes.');

        try {
            const response = await fetch('http://localhost:3000/api/text-to-3d', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: prompt }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'An unknown error occurred.');
            }

            showMessage('Model generated successfully! Loading viewer...', 'success');

            // Add event listeners to handle loading and errors
            modelViewer.addEventListener('error', (event) => {
                statusMessage.textContent = `Error loading model: ${event.detail}`;
                statusMessage.style.color = 'red';
            }, { once: true });

            // When model is loaded, create color pickers for each material
            modelViewer.addEventListener('load', () => {
                const colorEditorContainer = document.getElementById('color-editor-container');
                const colorPickers = document.getElementById('color-pickers');
                colorPickers.innerHTML = ''; // Clear previous pickers

                const materials = modelViewer.model.materials;
                materials.forEach((material, index) => {
                    const pickerContainer = document.createElement('div');
                    pickerContainer.className = 'color-picker-item';

                    const label = document.createElement('label');
                    label.textContent = `${material.name || `Part ${index + 1}`}:`;
                    label.htmlFor = `material-color-${index}`;

                    const colorInput = document.createElement('input');
                    colorInput.type = 'color';
                    colorInput.id = `material-color-${index}`;
                    const currentColor = material.pbrMetallicRoughness.baseColorFactor;
                    colorInput.value = `#${Math.round(currentColor[0] * 255).toString(16).padStart(2, '0')}${Math.round(currentColor[1] * 255).toString(16).padStart(2, '0')}${Math.round(currentColor[2] * 255).toString(16).padStart(2, '0')}`;

                    colorInput.addEventListener('input', (event) => {
                        const newColor = event.target.value;
                        const r = parseInt(newColor.substr(1, 2), 16) / 255;
                        const g = parseInt(newColor.substr(3, 2), 16) / 255;
                        const b = parseInt(newColor.substr(5, 2), 16) / 255;
                        material.pbrMetallicRoughness.setBaseColorFactor([r, g, b, 1]);
                    });

                    pickerContainer.appendChild(label);
                    pickerContainer.appendChild(colorInput);
                    colorPickers.appendChild(pickerContainer);
                });

                if (materials.length > 0) {
                    colorEditorContainer.classList.remove('hidden');
                }
            }, { once: true });

            // Set the model source through our CORS proxy and make it visible
            const proxyUrl = `/api/get-model?url=${encodeURIComponent(data.model_url)}`;
            modelViewer.src = proxyUrl;
            modelViewer.classList.remove('hidden');

            // Dynamically create download buttons
            createDownloadButtons(data.download_urls);
            downloadContainer.classList.remove('hidden');

        } catch (error) {
            console.error('Error:', error);
            showMessage(`Error: ${error.message}`, 'error');
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate';
        }
    });

    function createDownloadButtons(urls) {
        downloadContainer.innerHTML = ''; // Clear any existing buttons
        for (const format in urls) {
            if (urls[format]) {
                const button = document.createElement('button');
                button.textContent = `Download ${format.toUpperCase()}`;
                button.addEventListener('click', () => {
                    const a = document.createElement('a');
                    a.href = urls[format];
                    const filename = (promptInput.value.trim().replace(/\s+/g, '_') || 'model') + `.${format}`;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                });
                downloadContainer.appendChild(button);
            }
        }
    }

    function showMessage(message, type = 'info') {
        messageArea.textContent = message;
        messageArea.className = `message ${type}`;
    }
});