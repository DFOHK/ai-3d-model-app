document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('generator-form');
    const promptInput = document.getElementById('prompt-input');
    const generateBtn = document.getElementById('generate-btn');
    const messageArea = document.getElementById('message-area');
    const modelViewer = document.getElementById('model-viewer');
    const downloadContainer = document.getElementById('download-container');

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
            const response = await fetch('/api/text-to-3d', {
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
                console.error('Error loading model:', event.detail);
                showMessage(`Failed to load 3D model in the viewer. You can still download it. Error: ${event.detail.source.error}`, 'error');
            }, { once: true });

            modelViewer.addEventListener('load', () => {
                console.log('3D Model loaded successfully.');
                // You can keep the success message or change it
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