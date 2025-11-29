import os
import re
import glob

COMMANDS_DIR = ".gemini/commands"

def parse_frontmatter(content):
    match = re.match(r'^---\n(.*?)\n---\n(.*)', content, re.DOTALL)
    if match:
        frontmatter_raw = match.group(1)
        body = match.group(2)
        
        description = ""
        # Simple parsing of description key
        desc_match = re.search(r'^description:\s*(.*)$', frontmatter_raw, re.MULTILINE)
        if desc_match:
            description = desc_match.group(1).strip()
            # Remove quotes if present
            if (description.startswith('"') and description.endswith('"')) or \
               (description.startswith("'"') and description.endswith("'"')):
                description = description[1:-1]
        
        return description, body.strip()
    else:
        return "", content.strip()

def to_toml(description, prompt):
    # Escape quotes in description
    description = description.replace('"', '\"')
    
    # We will replace """ with \"\"\" just to be safe if they exist in the content.
    prompt_escaped = prompt.replace('"""', '\"\"\"')
    
    return f'description="{description}"\nprompt = """
{prompt_escaped}
"""\n'

def main():
    files = glob.glob(os.path.join(COMMANDS_DIR, "*.md"))
    print(f"Found {len(files)} files.")
    for file_path in files:
        with open(file_path, 'r') as f:
            content = f.read()
            
        description, body = parse_frontmatter(content)
        
        if not description:
            print(f"Warning: No description found for {file_path}, using default.")
            description = "Automated command"

        new_content = to_toml(description, body)
        
        new_file_path = file_path.replace(".md", ".toml")
        with open(new_file_path, 'w') as f:
            f.write(new_content)
            
        print(f"Converted {file_path} to {new_file_path}")
        os.remove(file_path)

if __name__ == "__main__":
    main()
