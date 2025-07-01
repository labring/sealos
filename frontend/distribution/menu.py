import sqlite3
from pydantic import BaseModel
from typing import List, Optional
DATABASE = 'rbac.db'

def init_menu_db():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    # 创建菜单表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS menus (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # 预置菜单数据
    predefined_menus = [
        ('镜像管理', '管理容器镜像'),
        ('应用管理', '管理应用程序'),
        ('节点管理', '管理集群节点'),
        ('租户管理', '管理租户信息'),
        ('算力测算', '计算资源测算'),
        ('节点监控', '监控节点状态'),
        ('菜单管理', '管理系统菜单'),
        ('配置管理', '管理系统配置'),
        ('告警管理', '管理系统告警')
    ]

    # 检查是否已经预置了菜单
    cursor.execute("SELECT COUNT(*) FROM menus")

    count = cursor.fetchone()[0]

    if count == 0:
        cursor.executemany("INSERT INTO menus (name, description) VALUES (?, ? )", predefined_menus)
        conn.commit()
        print("预置菜单数据已添加")

    # 创建角色表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        status INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')

    # 创建角色菜单关联表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS role_menus (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role_id INTEGER NOT NULL,
        menu_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE,
        UNIQUE (role_id, menu_id)
    )''')


    # 预置管理员角色
    cursor.execute("SELECT COUNT(*) FROM roles WHERE name = 'admin'")
    if cursor.fetchone()[0] == 0:
        cursor.execute(
            "INSERT INTO roles (name, description) VALUES (?, ?)",
            ('admin', '系统管理员')
        )
        admin_id = cursor.lastrowid
        # 为管理员分配所有菜单权限
        cursor.execute("SELECT id FROM menus")
        menu_ids = [row[0] for row in cursor.fetchall()]
        for menu_id in menu_ids:
            cursor.execute(
                "INSERT INTO role_menus (role_id, menu_id) VALUES (?, ?)",
                (admin_id, menu_id)
            )
    conn.commit()
    conn.close()

# 数据模型
class MenuItem(BaseModel):
    id: int
    name: str
    description: str
    created_at: str

# 数据模型
class Menu(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: str

class Role(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    status: int
    created_at: str
    updated_at: str

class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: Optional[int] = 1

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[int] = None

class RoleMenuAssign(BaseModel):
    menu_ids: List[int]


def get_all_menus():
    """获取所有菜单"""
    conn = sqlite3.connect('rbac.db')
    conn.row_factory = sqlite3.Row  # 使返回的行像字典一样
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM menus ORDER BY id")
    menus = cursor.fetchall()

    conn.close()
    return [dict(menu) for menu in menus]

@staticmethod
def get_all() -> List[Menu]:
    """获取所有菜单"""
    conn = sqlite3.connect('rbac.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM menus ORDER BY id")
    menus = [Menu(**dict(row)) for row in cursor.fetchall()]
    conn.close()
    return menus

@staticmethod
def get_by_menu_id(menu_id: int) -> Optional[Menu]:
    """根据ID获取菜单"""
    conn = sqlite3.connect('rbac.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM menus WHERE id = ?", (menu_id,))
    row = cursor.fetchone()
    conn.close()
    return Menu(**dict(row)) if row else None


@staticmethod
def get_all_roles() -> List[Role]:
    """获取所有角色"""
    conn = sqlite3.connect('rbac.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM roles ORDER BY id")
    roles = [Role(**dict(row)) for row in cursor.fetchall()]
    conn.close()
    return roles

@staticmethod
def get_by_role_id(role_id: int) -> Optional[Role]:
    """根据ID获取角色"""
    conn = sqlite3.connect('rbac.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM roles WHERE id = ?", (role_id,))
    row = cursor.fetchone()
    conn.close()
    return Role(**dict(row)) if row else None

@staticmethod
def createRole(role: RoleCreate) -> int:
    """创建新角色"""
    conn = sqlite3.connect('rbac.db')
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO roles (name, description, status) VALUES (?, ?, ?)",
        (role.name, role.description, role.status)
    )
    role_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return role_id

@staticmethod
def updateRole(role_id: int, role: RoleUpdate) -> bool:
    """更新角色信息"""
    conn = sqlite3.connect('rbac.db')
    cursor = conn.cursor()
    
    updates = []
    params = []
    
    if role.name:
        updates.append("name = ?")
        params.append(role.name)
    if role.description:
        updates.append("description = ?")
        params.append(role.description)
    if role.status is not None:
        updates.append("status = ?")
        params.append(role.status)
    
    if not updates:
        conn.close()
        return False
    
    updates.append("updated_at = CURRENT_TIMESTAMP")
    params.append(role_id)
    
    query = f"UPDATE roles SET {', '.join(updates)} WHERE id = ?"
    cursor.execute(query, params)
    affected = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return affected

@staticmethod
def deleteRole(role_id: int) -> bool:
    """删除角色"""
    conn = sqlite3.connect('rbac.db')
    cursor = conn.cursor()
    cursor.execute("DELETE FROM roles WHERE id = ?", (role_id,))
    affected = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return affected


