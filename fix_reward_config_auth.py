"""
Script to update reward_config.py to fix authorization checks
"""
import re

def fix_authorization_checks():
    """Fix all authorization checks in reward_config.py"""
    with open('app/routes/reward_config.py', 'r') as file:
        content = file.read()
    
    # Replace all admin authorization checks
    pattern = r"# Check if admin\s+if current_user\.type != \"admin\":\s+raise HTTPException\(status_code=403, detail=\"Only administrators can.*?\"\)"
    replacement = """# Allow various admin user types
    admin_types = ["admin", "administrator", "system"] 
    if current_user.type not in admin_types:
        print(f"User tried to access rewards config with type: {current_user.type}")
        raise HTTPException(status_code=403, detail="Only administrators can view reward configurations")"""
    
    modified_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    with open('app/routes/reward_config.py', 'w') as file:
        file.write(modified_content)
    
    print("Updated authorization checks in reward_config.py")

if __name__ == "__main__":
    fix_authorization_checks()