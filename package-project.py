import os
import zipfile

def zip_project(output_filename, source_dir):
    # Exclude directories
    exclude_dirs = {
        'venv', 
        'node_modules', 
        '__pycache__', 
        '.git', 
        '.idea', 
        '.vscode', 
        '.next',
        'dist',
        '.vite',
        '.ipynb_checkpoints'
    }
    
    # Exclude file extensions
    exclude_exts = {'.pyc', '.pyo', '.log'}

    print(f"Starting to zip project from {source_dir} into {output_filename}...")
    
    zip_count = 0
    with zipfile.ZipFile(output_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            # Modify dirs in-place to avoid traversing excluded directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                ext = os.path.splitext(file)[1]
                if ext in exclude_exts:
                    continue
                    
                full_path = os.path.join(root, file)
                # Calculate relative path to store in zip
                rel_path = os.path.relpath(full_path, source_dir)
                
                # Do not zip the output zip file itself if it is in the same folder
                if file == output_filename:
                    continue
                    
                zipf.write(full_path, rel_path)
                zip_count += 1

    print(f"Zipping complete! Zipped {zip_count} files successfully into '{output_filename}'.")

if __name__ == '__main__':
    root_dir = os.path.dirname(os.path.abspath(__file__))
    zip_name = "intelligent_ecommerce_project.zip"
    zip_path = os.path.join(root_dir, zip_name)
    zip_project(zip_path, root_dir)
