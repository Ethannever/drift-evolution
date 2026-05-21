# 敌人AI - v1.1
# 自动追踪玩家并攻击

extends CharacterBody2D

class_name Enemy

signal died(enemy: Node2D, killer: Node2D)
signal damaged(damage: float, attacker: Node2D)

var enemy_id: String = "hostile_raft"
var enemy_name: String = "敌对载具"
var max_hp: float = 50.0
var current_hp: float = 50.0
var damage: float = 10.0
var speed: float = 80.0
var detection_range: float = 300.0
var attack_range: float = 50.0

var behavior: String = "chase"  # chase, patrol, ambush, flee_when_hurt
var drop_table: Dictionary = {}

var _target: Node2D = null
var _state: String = "idle"
var _patrol_point: Vector2 = Vector2.ZERO
var _patrol_timer: float = 0.0
var _attack_cooldown: float = 0.0
var _is_aggro: bool = false


func _ready():
	add_to_group("enemies")
	add_to_group("vehicles")
	current_hp = max_hp
	
	# 初始巡逻点
	_patrol_point = global_position


func _physics_process(delta: float):
	_find_target()
	_update_state(delta)
	_execute_behavior(delta)
	_update_cooldowns(delta)


func _find_target():
	# 查找玩家
	var player = get_tree().root.get_node("MainWorld/Player")
	if player:
		var dist = global_position.distance_to(player.global_position)
		if dist < detection_range:
			_target = player
			_is_aggro = true
		else:
			_is_aggro = false


func _update_state(delta: float):
	if not _target:
		_state = "patrol"
	elif _is_aggro:
		var dist = global_position.distance_to(_target.global_position)
		if dist > attack_range:
			_state = "chase"
		elif dist <= attack_range:
			_state = "attack"
		else:
			_state = "idle"
	
	# 根据行为调整状态
	match behavior:
		"flee_when_hurt":
			if current_hp < max_hp * 0.3:
				_state = "flee"
		"patrol":
			if not _is_aggro:
				_state = "patrol"


func _execute_behavior(delta: float):
	match _state:
		"idle":
			velocity = velocity.lerp(Vector2.ZERO, 0.1)
		
		"patrol":
			_patrol(delta)
		
		"chase":
			_chase(delta)
		
		"attack":
			_attack()
		
		"flee":
			_flee(delta)
	
	move_and_slide()


func _patrol(delta: float):
	_patrol_timer += delta
	if _patrol_timer > 5.0 or global_position.distance_to(_patrol_point) < 20:
		_patrol_timer = 0.0
		_patrol_point = global_position + Vector2(randf_range(-100, 100), randf_range(-100, 100))
	
	var dir = global_position.direction_to(_patrol_point)
	velocity = velocity.lerp(dir * speed * 0.3, 0.05)


func _chase(delta: float):
	if not _target:
		return
	
	var dir = global_position.direction_to(_target.global_position)
	velocity = velocity.lerp(dir * speed, 0.1)
	
	# 面向目标
	look_at(_target.global_position)


func _attack():
	if _attack_cooldown > 0:
		return
	
	_attack_cooldown = 1.0  # 1秒冷却
	
	if _target and _target.has_method("take_damage"):
		_target.take_damage(damage, self)
	
	# 面向目标
	if _target:
		look_at(_target.global_position)


func _flee(delta: float):
	if not _target:
		return
	
	# 向远离目标的方向逃跑
	var dir = global_position.direction_to(_target.global_position)
	velocity = velocity.lerp(-dir * speed, 0.15)


func _update_cooldowns(delta: float):
	if _attack_cooldown > 0:
		_attack_cooldown -= delta


# ==================== 伤害系统 ====================

func take_damage(amount: float, attacker: Node2D = null) -> Dictionary:
	current_hp = max(0, current_hp - amount)
	emit_signal("damaged", amount, attacker)
	
	var result = {
		"damage": amount,
		"hp_remaining": current_hp,
		"destroyed": current_hp <= 0
	}
	
	if result["destroyed"]:
		_die(attacker)
	
	return result


func apply_knockback(direction: Vector2, force: float = 50.0):
	velocity += direction * force


func get_defense() -> float:
	# 敌人基础防御
	return 0.0


func _die(killer: Node2D):
	emit_signal("died", self, killer)
	
	# 掉落物品
	_drop_items(killer)
	
	# 移除
	queue_free()


func _drop_items(killer: Node2D):
	if not killer or not killer.has_method("add_item"):
		return
	
	for item_id in drop_table.keys():
		var amount = drop_table[item_id]
		killer.add_item(item_id, amount)


# ==================== 碰撞 ====================

func _on_body_entered(body: Node):
	if body == self:
		return
	
	# 玩家碰撞造成伤害
	if body.is_in_group("vehicles") and not body.is_in_group("enemies"):
		if body.has_method("take_damage"):
			var collision_damage = damage * 0.5
			body.take_damage(collision_damage, self)


# ==================== 存档 ====================

func get_save_data() -> Dictionary:
	return {
		"enemy_id": enemy_id,
		"enemy_name": enemy_name,
		"current_hp": current_hp,
		"position": {"x": global_position.x, "y": global_position.y}
	}
