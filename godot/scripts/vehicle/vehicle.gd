# v1.1 载具基础脚本
# 木筏 - 初始载具
# v1.1: 添加武器系统、防御、无敌帧

extends CharacterBody2D

# 载具数据
var vehicle_name: String = "木筏"
var vehicle_stage: String = "raft"
var max_hp: float = 50.0
var current_hp: float = 50.0
var speed: float = 100.0
var rotation_speed: float = 2.0
var cargo_capacity: int = 5
var defense: float = 0.0

# 物资
var inventory: Dictionary = {
	"wood": 10,
	"food": 5,
	"water": 3
}

# 科技点（用于进化）
var tech_points: int = 0

# 移动状态
var move_direction: Vector2 = Vector2.ZERO
var target_rotation: float = 0.0

# v1.1 武器系统
var weapons: Array = []
var current_weapon_index: int = 0

# 动画
@onready var sprite: Sprite2D = $Sprite2D
@onready var anim_player: AnimationPlayer = $AnimationPlayer

# 洋流影响
var drift_force: Vector2 = Vector2.ZERO
var drift_timer: float = 0.0

# v1.1 受伤无敌
var _is_invulnerable: bool = false
var _invulnerability_timer: float = 0.0


func _ready():
	add_to_group("vehicles")
	current_hp = max_hp


func _physics_process(delta: float):
	_handle_input(delta)
	_apply_drift(delta)
	_apply_movement(delta)
	_update_invulnerability(delta)
	_update_animation()


func _handle_input(delta: float):
	# 前进/后退
	var thrust = 0.0
	if Input.is_action_pressed("ui_up") or Input.is_action_pressed("move_forward"):
		thrust = 1.0
	elif Input.is_action_pressed("ui_down") or Input.is_action_pressed("move_backward"):
		thrust = -0.5
	
	# 转向
	var turn = 0.0
	if Input.is_action_pressed("ui_left") or Input.is_action_pressed("turn_left"):
		turn = -1.0
	elif Input.is_action_pressed("ui_right") or Input.is_action_pressed("turn_right"):
		turn = 1.0
	
	# 应用移动
	if thrust != 0:
		velocity = transform.x * speed * thrust * delta * 60
	else:
		velocity = velocity.lerp(Vector2.ZERO, 0.1)
	
	# 应用转向
	rotation += turn * rotation_speed * delta
	
	move_and_slide()
	
	# v1.1 武器输入
	_handle_weapon_input()


func _handle_weapon_input():
	# v1.1 武器切换
	if Input.is_action_just_pressed("weapon_next"):
		_switch_weapon(1)
	elif Input.is_action_just_pressed("weapon_prev"):
		_switch_weapon(-1)
	
	# v1.1 开火
	if Input.is_action_pressed("fire"):
		_fire_current_weapon()


func _apply_drift(delta: float):
	# 模拟洋流
	drift_timer += delta
	if drift_timer > 3.0:
		drift_timer = 0.0
		drift_force = Vector2(randf_range(-10, 10), randf_range(-10, 10))
	
	position += drift_force * delta


func _apply_movement(delta: float):
	# v1.0 简单移动
	pass


func _update_invulnerability(delta: float):
	if _invulnerability_timer > 0:
		_invulnerability_timer -= delta
		_is_invulnerable = _invulnerability_timer > 0
	
	# 受伤闪烁效果
	if _is_invulnerable and sprite:
		sprite.modulate = Color(1, 1, 1, 0.5) if int(Time.get_ticks_msec() / 100) % 2 == 0 else Color.WHITE


func _update_animation():
	# 漂浮动画
	if sprite and not _is_invulnerable:
		sprite.modulate = Color.WHITE


func take_damage(amount: float, attacker: Node2D = null) -> Dictionary:
	# v1.1 无敌帧
	if _is_invulnerable:
		return {"damage": 0, "blocked": true, "hp_remaining": current_hp, "destroyed": false}
	
	# 防御减伤
	var actual_damage = max(1.0, amount - defense)
	current_hp = max(0, current_hp - actual_damage)
	
	# 受伤无敌
	_invulnerability_timer = 0.5
	
	var result = {
		"damage": actual_damage,
		"hp_remaining": current_hp,
		"destroyed": current_hp <= 0
	}
	
	if result.destroyed:
		queue_free()
	
	return result


func apply_knockback(direction: Vector2, force: float = 50.0):
	velocity += direction * force


func get_defense() -> float:
	return defense


func repair(amount: float):
	current_hp = min(max_hp, current_hp + amount)


func add_tech_points(amount: int):
	tech_points += amount
	print("[Vehicle] 获得 ", amount, " 科技点 (总计: ", tech_points, ")")


# ==================== v1.1 武器系统 ====================

func add_weapon(weapon: Weapon):
	weapon.set_owner(self)
	weapons.append(weapon)
	print("[Vehicle] 装备武器: ", weapon.weapon_name)


func get_current_weapon() -> Weapon:
	if weapons.size() > 0 and current_weapon_index < weapons.size():
		return weapons[current_weapon_index]
	return null


func _switch_weapon(delta: int):
	if weapons.size() <= 1:
		return
	current_weapon_index = (current_weapon_index + delta + weapons.size()) % weapons.size()
	print("[Vehicle] 切换武器: ", current_weapon_index)


func _fire_current_weapon():
	var weapon = get_current_weapon()
	if not weapon:
		return
	
	# 获取鼠标方向作为目标
	var mouse_pos = get_global_mouse_position()
	weapon.fire(mouse_pos)


# ==================== 物品系统 ====================

func add_item(item_type: String, amount: int) -> bool:
	var current_total = inventory.values().reduce(func(a, b): return a + b, 0)
	if current_total >= cargo_capacity:
		return false
	inventory[item_type] = inventory.get(item_type, 0) + amount
	return true


func remove_item(item_type: String, amount: int) -> bool:
	if inventory.get(item_type, 0) < amount:
		return false
	inventory[item_type] -= amount
	return true


func get_inventory_total() -> int:
	return inventory.values().reduce(func(a, b): return a + b, 0)


func get_hp_percent() -> float:
	return current_hp / max_hp if max_hp > 0 else 0.0


# ==================== 存档 ====================

func get_save_data() -> Dictionary:
	return {
		"vehicle_name": vehicle_name,
		"vehicle_stage": vehicle_stage,
		"current_hp": current_hp,
		"position": {"x": position.x, "y": position.y},
		"rotation": rotation,
		"inventory": inventory,
		"tech_points": tech_points
	}


func load_save_data(data: Dictionary):
	vehicle_name = data.get("vehicle_name", vehicle_name)
	vehicle_stage = data.get("vehicle_stage", vehicle_stage)
	current_hp = data.get("current_hp", max_hp)
	var pos = data.get("position", {"x": 0, "y": 0})
	position = Vector2(pos.get("x", 0), pos.get("y", 0))
	rotation = data.get("rotation", 0.0)
	inventory = data.get("inventory", inventory)
	tech_points = data.get("tech_points", 0)
