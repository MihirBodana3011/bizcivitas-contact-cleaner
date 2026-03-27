document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('cleaner-form');
    const fileInput = document.getElementById('file-input');
    const dropZone = document.getElementById('drop-zone');
    const fileLabel = document.getElementById('file-label');
    const memberNameInput = document.getElementById('member_name');
    const submitBtn = document.getElementById('submit-btn');
    const fileStatus = document.getElementById('file-status');
    const selectedFilenameLabel = document.getElementById('selected-filename');
    const removeFileBtn = document.getElementById('remove-file');
    const loadingOverlay = document.getElementById('loading-overlay');

    let selectedFile = null;

    // Drag and Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });

    // File Input
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    function handleFileSelect(file) {
        const allowedExtensions = /(\.csv|\.xlsx|\.xls)$/i;
        if (!allowedExtensions.exec(file.name)) {
            alert('Please select a CSV or Excel file.');
            return;
        }

        selectedFile = file;
        selectedFilenameLabel.textContent = file.name;
        fileStatus.classList.remove('hidden');
        dropZone.classList.add('hidden');
        validateForm();
    }

    removeFileBtn.addEventListener('click', () => {
        selectedFile = null;
        fileInput.value = '';
        fileStatus.classList.add('hidden');
        dropZone.classList.remove('hidden');
        validateForm();
    });

    memberNameInput.addEventListener('input', validateForm);

    function validateForm() {
        const isNameValid = memberNameInput.value.trim().length > 0;
        const isFileValid = selectedFile !== null;
        submitBtn.disabled = !(isNameValid && isFileValid);
    }

    // Submit Handling
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!selectedFile || !memberNameInput.value.trim()) return;

        loadingOverlay.classList.remove('hidden');
        
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('member_name', memberNameInput.value.trim());

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                
                // Construct filename for download
                const memberName = memberNameInput.value.trim();
                a.download = `${memberName} + Bizcivitas Contact.xlsx`;
                
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                
                // Reset form or show success message
                alert('File processed and download started!');
            } else {
                const errorData = await response.json();
                alert('Error: ' + (errorData.error || 'Unknown error occurred'));
            }
        } catch (error) {
            console.error('Upload failed:', error);
            alert('An unexpected error occurred. Please try again.');
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    });
});
