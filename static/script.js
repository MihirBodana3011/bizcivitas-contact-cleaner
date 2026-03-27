document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('cleaner-form');
    const fileInput = document.getElementById('file-input');
    const dropZone = document.getElementById('drop-zone');
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
        submitBtn.disabled = !(memberNameInput.value.trim().length > 0 && selectedFile !== null);
    }

    // --- Core Logic Implementation in JavaScript ---
    
    function cleanPhoneNumbers(phoneStrings) {
        const pattern = /(?:(?:\+|00)?(?:91|091|0)[\s\-\(\)]*)?([6789](?:[\s\-\(\)]*\d){9})/g;
        const validNumbers = [];

        phoneStrings.forEach(pStr => {
            if (!pStr || String(pStr).toLowerCase() === 'nan' || !String(pStr).trim()) return;
            
            const matches = String(pStr).matchAll(pattern);
            for (const match of matches) {
                const num = match[1].replace(/\D/g, '');
                if (num && num.length === 10) validNumbers.push(num);
            }
        });

        return [...new Set(validNumbers)];
    }

    async function processFile(file, memberName) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheet];
                
                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                const outRows = [];
                let maxEmails = 0;
                let maxPhones = 0;

                jsonData.forEach(row => {
                    const columns = Object.keys(row);
                    
                    // Name extraction
                    let fullName = '';
                    const fname = String(row['First Name'] || '').trim();
                    const mname = String(row['Middle Name'] || '').trim();
                    const lname = String(row['Last Name'] || '').trim();
                    fullName = [fname, mname, lname].filter(n => n && n !== 'undefined' && n !== 'null' && n.toLowerCase() !== 'nan').join(' ');

                    if (!fullName && row['Name']) {
                        fullName = String(row['Name']).trim();
                    }

                    const orgName = String(row['Organization Name'] || '').trim();

                    // Email columns
                    const emailCols = columns.filter(c => (/email/i.test(c)) || (/E-mail.*Value/i.test(c)));
                    const emails = [];
                    emailCols.forEach(c => {
                        const val = String(row[c] || '').trim();
                        if (val && val !== 'undefined' && val.toLowerCase() !== 'nan' && !emails.includes(val)) {
                            emails.push(val);
                        }
                    });
                    maxEmails = Math.max(maxEmails, emails.length);

                    // Phone columns
                    const phoneCols = columns.filter(c => (/phone|mobile|contact/i.test(c)) || (/Phone.*Value/i.test(c)));
                    const rawPhones = [];
                    phoneCols.forEach(c => {
                        const val = String(row[c] || '').trim();
                        if (val && val !== 'undefined' && val.toLowerCase() !== 'nan') {
                            rawPhones.push(val);
                        }
                    });

                    const cleanedPhones = cleanPhoneNumbers(rawPhones);
                    maxPhones = Math.max(maxPhones, cleanedPhones.length);

                    // Add only if phone exists (User requirement)
                    if (cleanedPhones.length > 0) {
                        outRows.push({
                            fullName,
                            orgName,
                            emails,
                            phones: cleanedPhones
                        });
                    }
                });

                // Structured data for Excel
                const finalData = outRows.map(r => {
                    const rowDict = {
                        'Full Name': r.fullName,
                        'Organization Name': r.orgName
                    };
                    for (let i = 0; i < maxEmails; i++) {
                        rowDict[`Email ID ${i + 1}`] = r.emails[i] || '';
                    }
                    for (let i = 0; i < maxPhones; i++) {
                        rowDict[`Phone No. ${i + 1}`] = r.phones[i] || '';
                    }
                    return rowDict;
                });

                const newSheet = XLSX.utils.json_to_sheet(finalData);
                const newWorkbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(newWorkbook, newSheet, "Cleaned Contacts");
                
                const wbout = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'array' });
                resolve(wbout);
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!selectedFile || !memberNameInput.value.trim()) return;

        loadingOverlay.classList.remove('hidden');
        
        try {
            const memberName = memberNameInput.value.trim();
            const excelBuffer = await processFile(selectedFile, memberName);
            
            const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${memberName} + Bizcivitas Contact.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            
            alert('File cleaned successfully! Download started.');
        } catch (error) {
            console.error(error);
            alert('Error processing file. Please check the console.');
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    });
});
