document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('generator-form');
    const promptInput = document.getElementById('prompt-input');
    const generateBtn = document.getElementById('generate-btn');
    const downloadBtn = document.getElementById('download-btn');
    const messageArea = document.getElementById('message-area');
    const modelViewer = document.getElementById('model-viewer');
    const viewerIframe = document.getElementById('viewer-iframe');

    let modelUrl = null; // Variable to store the model URL

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const prompt = promptInput.value.trim();

        if (!prompt) {
            showMessage('Please enter a prompt.', 'error');
            return;
        }

        // Reset UI for new generation
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';
        modelViewer.classList.add('hidden');
        downloadBtn.classList.add('hidden');
        showMessage('Starting generation process... this may take a few minutes.');

        try {
            const response = await fetch('/api/text-to-3d', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: prompt }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'An unknown error occurred.');
            }

            const data = await response.json();
            modelUrl = data.model_url; // Save the model URL

            showMessage('Model generated successfully! Loading viewer...', 'success');
            
            // Display the model viewer
            viewerIframe.src = `https://3dviewer.net/#model=${modelUrl}`;
            modelViewer.classList.remove('hidden');
            downloadBtn.classList.remove('hidden'); // Show the download button

        } catch (error) {
            console.error('Error:', error);
            showMessage(`Error: ${error.message}`, 'error');
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate';
        }
    });

    downloadBtn.addEventListener('click', () => {
        if (modelUrl) {
            const a = document.createElement('a');
            a.href = modelUrl;
            // Suggest a filename for the download
            const filename = (promptInput.value.trim().replace(/\s+/g, '_') || 'model') + '.glb';
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            showMessage('No model URL found to download.', 'error');
        }
    });

    function showMessage(message, type = 'info') {
        messageArea.textContent = message;
        messageArea.style.color = type === 'error' ? '#d9534f' : '#333';
    }
});