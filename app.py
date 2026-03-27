import os
from flask import Flask, render_template, request, send_file, jsonify
from werkzeug.utils import secure_filename
from Contact_Cleaner_Tool import process_file

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB limit

if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    member_name = request.form.get('member_name', '').strip()
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file:
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        try:
            success, result = process_file(file_path, member_name)
            if success:
                # Return the file for download
                return send_file(result, as_attachment=True)
            else:
                return jsonify({'error': result}), 500
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        finally:
            # Clean up uploaded raw file optionally, 
            # but usually better to keep for a bit or delete after process
            pass

if __name__ == '__main__':
    app.run(debug=True)
