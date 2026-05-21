# 战斗系统 - v1.1
# 管理战斗逻辑、伤害计算、战斗状态

extends Node

signal combat_started(combatants: Array)
signal combat_ended(winner: Node2D, loser: Node2D)
signal damage_dealt(attacker: Node2D, defender: Node2D, damage: float)
signal enemy_spawned(enemy: Node2D)

var _active_combatants: Array = []
var _spawn_timer: float = 0.0
var _spawn_interval: float = 30.0  # 30秒生成一个敌人
var _difficulty_timer: float = 0.0
var _current_difficulty: int = 1

# 预制敌人场景
var _enemy_scenes: Dictionary = {}


func _ready():
	_init_enemy_scenes()


func _init_enemy_scenes():
	# 注册敌人场景（后续从配置加载）
	pass


func _process(delta: float):
	_spawn_timer += delta
	_difficulty_timer += delta
	
	# 增加难度
	if _difficulty_timer > 120.0:  # 每2分钟
		_difficulty_timer = 0.0
		_current_difficulty = min(_current_difficulty + 1, 10)
	
	# 定时生成敌人
	if _spawn_timer >= _spawn_interval:
		_spawn_timer = 0.0
		_spawn_random_enemy()


# ==================== 战斗管理 ====================

func start_combat(attacker: Node2D, defender: Node2D):
	if attacker in _active_combatants or defender in _active_combatants:
		return  # 已经在战斗中
	
	_active_combatants.append(attacker)
	_active_combatants.append(defender)
	emit_signal("combat_started", [attacker, defender])


func end_combat(winner: Node2D, loser: Node2D):
	_active_combatants.erase(winner)
	_active_combatants.erase(loser)
	emit_signal("combat_ended", winner, loser)


# ==================== 伤害计算 ====================

func calculate_damage(base_damage: float, attacker: Node2D, defender: Node2D, damage_type: int = 0) -> float:
	var final_damage = base_damage
	
	# 伤害类型修正（后续扩展）
	match damage_type:
		0:  # 物理伤害
			pass
		1:  # 爆炸伤害
			final_damage *= 1.5
		2:  # 能量伤害
			pass
	
	# 距离衰减（远程武器）
	if attacker and defender:
		var distance = attacker.global_position.distance_to(defender.global_position)
		if distance > 200:
			final_damage *= clamp(1.0 - (distance - 200) / 800, 0.3, 1.0)
	
	# 防御修正（如果有护甲）
	if defender.has_method("get_defense"):
		final_damage = max(1.0, final_damage - defender.get_defense())
	
	return final_damage


func apply_damage(target: Node2D, damage: float, attacker: Node2D = null):
	if not target or not target.has_method("take_damage"):
		return
	
	var result = target.take_damage(damage)
	emit_signal("damage_dealt", attacker, target, damage)
	
	# 检查是否死亡
	if result.get("destroyed", false):
		if attacker and attacker.has_method("on_enemy_destroyed"):
			attacker.on_enemy_destroyed(target)


# ==================== 敌人生成 ====================

func spawn_enemy(enemy_id: String, position: Vector2) -> Node2D:
	# 从 ContentRegistry 获取敌人数据
	var registry = get_node_or_null("/root/ContentRegistry")
	var enemy_data = null
	if registry:
		enemy_data = registry.get_content("enemies", enemy_id)
	
	# 创建敌人实例（使用默认场景）
	var enemy = _create_default_enemy(enemy_data)
	enemy.global_position = position
	
	var world = get_tree().root.get_node("MainWorld")
	if world:
		world.add_child(enemy)
	
	emit_signal("enemy_spawned", enemy)
	return enemy


func _spawn_random_enemy():
	var registry = get_node_or_null("/root/ContentRegistry")
	if not registry:
		return
	
	# 获取当前难度范围内的敌人
	var all_enemies = registry.get_all_content("enemies")
	var valid_enemies = []
	
	for enemy_id in all_enemies:
		var enemy = all_enemies[enemy_id]
		if enemy.get("difficulty", 1) <= _current_difficulty:
			valid_enemies.append(enemy)
	
	if valid_enemies.size() == 0:
		return
	
	# 随机选择
	var chosen = valid_enemies[randi() % valid_enemies.size()]
	
	# 在屏幕边缘生成
	var viewport = get_viewport_rect()
	var spawn_pos = _get_spawn_position(viewport)
	
	spawn_enemy(chosen.id, spawn_pos)


func _get_spawn_position(viewport: Rect2) -> Vector2:
	var player = get_tree().root.get_node("MainWorld/Player")
	var pos: Vector2
	
	# 在玩家附近生成，但有一定距离
	if player:
		pos = player.global_position + Vector2(randf_range(-400, 400), randf_range(-400, 400))
	else:
		pos = Vector2(randf_range(100, viewport.size.x - 100), randf_range(100, viewport.size.y - 100))
	
	return pos


func _create_default_enemy(enemy_data: Dictionary) -> Node2D:
	# 创建一个默认的敌人载具
	var enemy = CharacterBody2D.new()
	enemy.set_script(preload("res://scripts/combat/enemy.gd"))
	
	if enemy_data:
		enemy.enemy_id = enemy_data.get("id", "unknown")
		enemy.enemy_name = enemy_data.get("name", "未知敌人")
		enemy.max_hp = enemy_data.get("hp", 50)
		enemy.current_hp = enemy.max_hp
		enemy.damage = enemy_data.get("damage", 10)
		enemy.speed = enemy_data.get("speed", 100)
		enemy.behavior = enemy_data.get("behavior", "chase")
		enemy.drop_table = enemy_data.get("drop_table", {})
	
	enemy.add_to_group("enemies")
	enemy.add_to_group("combatants")
	
	return enemy


# ==================== 工具 ====================

func get_active_combatants() -> Array:
	return _active_combatants.duplicate()


func is_in_combat(node: Node2D) -> bool:
	return node in _active_combatants


func get_difficulty() -> int:
	return _current_difficulty
