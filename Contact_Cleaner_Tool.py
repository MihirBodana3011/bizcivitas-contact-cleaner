import pandas as pd
import re
import os
import tkinter as tk
from tkinter import filedialog, messagebox

def clean_phone_numbers(phone_strings):
    valid_numbers = []
    
    # Regex designed to find Indian mobile numbers in messy text
    # It looks for an optional country code (+91, 0091, 91, 0)
    # followed by exactly 10 digits starting with 6, 7, 8, or 9
    # allowing spaces, hyphens, or parentheses in between.
    pattern = r'(?:(?:\+|00)?(?:91|091|0)[\s\-\(\)]*)?([6789](?:[\s\-\(\)]*\d){9})'
    
    for p_str in phone_strings:
        if pd.isna(p_str) or str(p_str).strip().lower() == 'nan' or not str(p_str).strip():
            continue
            
        p_str = str(p_str).strip()
        
        # Because pandas sometimes reads integers as floats (e.g., 9876543210 -> '9876543210.0')
        # We find all matches inside the string using the regex.
        matches = re.findall(pattern, p_str)
        
        for match in matches:
            # Strip out formatting characters to leave just the 10 digits
            num = re.sub(r'\D', '', match)
            if num and len(num) == 10:
                valid_numbers.append(num)
                
    # eliminate duplicates
    seen = set()
    unique_numbers = []
    for num in valid_numbers:
        if num not in seen:
            seen.add(num)
            unique_numbers.append(num)
            
    return unique_numbers

def process_file(file_path, member_name=None):
    try:
        # Load File
        if file_path.lower().endswith('.csv'):
            df = pd.read_csv(file_path, dtype=str)
        elif file_path.lower().endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file_path, dtype=str)
        else:
            return False, "Unsupported file format. Please SELECT CSV or Excel (.xlsx) files."
            
        columns = df.columns.tolist()
        
        # Determine Email Columns dynamically
        email_cols = [c for c in columns if 'E-mail' in str(c) and 'Value' in str(c)]
        if not email_cols:
            email_cols = [c for c in columns if 'email' in str(c).lower()]
            
        # Determine Phone Columns dynamically
        phone_cols = [c for c in columns if 'Phone' in str(c) and 'Value' in str(c)]
        if not phone_cols:
            phone_cols = [c for c in columns if 'phone' in str(c).lower() or 'mobile' in str(c).lower() or 'contact' in str(c).lower()]
            
        out_rows = []
        max_emails = 0
        max_phones = 0
        
        for _, row in df.iterrows():
            # Get Name
            fname = str(row['First Name']).strip() if 'First Name' in columns and pd.notna(row['First Name']) else ''
            mname = str(row['Middle Name']).strip() if 'Middle Name' in columns and pd.notna(row['Middle Name']) else ''
            lname = str(row['Last Name']).strip() if 'Last Name' in columns and pd.notna(row['Last Name']) else ''
            full_name = ' '.join([n for n in [fname, mname, lname] if str(n).lower() != 'nan' and n])
            
            # fallback if 'Name' column exists
            if not full_name and 'Name' in columns and pd.notna(row['Name']):
                full_name = str(row['Name']).strip()
                if full_name.lower() == 'nan': full_name = ''
                
            # Get Organization Name
            org_name = str(row['Organization Name']).strip() if 'Organization Name' in columns and pd.notna(row['Organization Name']) else ''
            if org_name.lower() == 'nan': org_name = ''
            
            # Emails
            emails = []
            for c in email_cols:
                val = str(row[c]).strip()
                if val and val.lower() != 'nan' and val not in emails:
                    emails.append(val)
            max_emails = max(max_emails, len(emails))
            
            # Phones
            raw_phones = []
            for c in phone_cols:
                val = str(row[c]).strip()
                if val and val.lower() != 'nan':
                    raw_phones.append(val)
            
            cleaned_phones = clean_phone_numbers(raw_phones)
            max_phones = max(max_phones, len(cleaned_phones))
            
            # Add to list ONLY if cleaned_phones is not empty (as requested)
            if cleaned_phones:
                out_rows.append({
                    'Full Name': full_name,
                    'Organization Name': org_name,
                    'emails': emails,
                    'phones': cleaned_phones
                })
                
        # create new structured dict
        clean_data = []
        for r in out_rows:
            row_dict = {
                'Full Name': r['Full Name'],
                'Organization Name': r['Organization Name']
            }
            for i in range(max_emails):
                col_name = f'Email ID {i+1}'
                row_dict[col_name] = r['emails'][i] if i < len(r['emails']) else ''
                
            for i in range(max_phones):
                col_name = f'Phone No. {i+1}'
                row_dict[col_name] = r['phones'][i] if i < len(r['phones']) else ''
                
            clean_data.append(row_dict)
            
        clean_df = pd.DataFrame(clean_data)
        
        # construct output path
        base_dir = os.path.dirname(file_path)
        if member_name:
            out_filename = f"{member_name} + Bizcivitas Contact.xlsx"
        else:
            base_name, _ = os.path.splitext(os.path.basename(file_path))
            out_filename = f"{base_name}_cleaned.xlsx"
            
        out_path = os.path.join(base_dir, out_filename)
        
        clean_df.to_excel(out_path, index=False)
        return True, out_path
        
    except Exception as e:
        return False, str(e)

def select_file():
    root = tk.Tk()
    root.withdraw() # Hide the main window
    
    file_path = filedialog.askopenfilename(
        title="Select Contacts File to Clean",
        filetypes=[("Excel & CSV files", "*.csv *.xlsx *.xls"), ("All files", "*.*")]
    )
    
    if file_path:
        root.update()
        messagebox.showinfo("Processing", "Please wait, the file is being cleaned...")
        success, msg = process_file(file_path)
        if success:
            messagebox.showinfo("Success", f"File cleaned successfully!\nSaved at:\n{msg}")
        else:
            messagebox.showerror("Error", f"Failed to process file:\n{msg}")
    
    root.destroy()

if __name__ == "__main__":
    select_file()
