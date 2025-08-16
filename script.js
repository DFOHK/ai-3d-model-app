document.addEventListener('DOMContentLoaded', () => {
    const promptForm = document.getElementById('prompt-form');
    const promptInput = document.getElementById('prompt-input');
    const chatBox = document.getElementById('chat-box');
    const viewerContainer = document.getElementById('viewer-container');
    const downloadBtn = document.getElementById('download-btn');
    let modelUrl = null;

    promptForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const prompt = promptInput.value.trim();
        if (!prompt) return;

        appendMessage('user', prompt);
        promptInput.value = '';
        downloadBtn.style.display = 'none';
        modelUrl = null;

        // Simulate AI thinking
        appendMessage('assistant', '正在生成您的模型...');

        fetch('/api/text-to-3d', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt: prompt })
        })
        .then(response => response.json())
        .then(data => {
            if (data.model_url) {
                modelUrl = data.model_url;
                displayModel(modelUrl);
                updateAssistantMessage('您的模型已生成。');
                downloadBtn.style.display = 'inline-block';
            } else {
                updateAssistantMessage('生成模型时出错，请稍后再试。');
                console.error('Meshy API Error:', data);
            }
        })
        .catch(error => {
            updateAssistantMessage('生成模型时出错，请稍后再试。');
            console.error('Fetch Error:', error);
        });
    });

    downloadBtn.addEventListener('click', () => {
        if (modelUrl) {
            const a = document.createElement('a');
            a.href = modelUrl;
            a.download = 'model.stl'; 
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    });

    function appendMessage(sender, text) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);
        messageElement.textContent = text;
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function updateAssistantMessage(text) {
        const assistantMessages = chatBox.querySelectorAll('.assistant-message');
        const lastMessage = assistantMessages[assistantMessages.length - 1];
        if (lastMessage) {
            lastMessage.textContent = text;
        }
    }

    function displayModel(url) {
        viewerContainer.innerHTML = `
            <iframe
                src="https://www.viewstl.com/?embedded&url=${encodeURIComponent(url)}"
                width="100%"
                height="100%"
                frameborder="0"
            ></iframe>
        `;
    }
});