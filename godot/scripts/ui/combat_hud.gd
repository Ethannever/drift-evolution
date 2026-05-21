# 战斗HUD - v1.1
# 显示敌人血条、武器状态、战斗指示

extends Control

@onready var enemy_health_container: VBoxContainer = $EnemyHealthContainer
@onready var weapon_panel: PanelContainer = $WeaponPanel
@onready var weapon_name_label: Label = $WeaponPanel/VBox/WeaponName
@onready var weapon_ammo_label: Label = $WeaponPanel/VBox/AmmoLabel
@onready var weapon_cooldown_bar: ProgressBar = $WeaponPanel/VBox/CooldownBar
@onready var combat_log: RichTextLabel = $CombatLog

var _enemy_health_bars: Dictionary = {}  # enemy_id -> ProgressBar
var _combat_log_messages: Array = []
var _max_log_messages: int = 5


func _ready():
	# 监听战斗信号
	var combat_system = get_node_or_null("/root/CombatSystem")
	if combat_system:
		combat_system.enemy_spawned.connect(_on_enemy_spawned)
		combat_system.damage_dealt.connect(_on_damage_dealt)
		combat_system.combat_ended.connect(_on_combat_ended)


func _process(delta: float):
	_update_enemy_health_bars()
	_update_weapon_display()


func _update_enemy_health_bars():
	var enemies = get_tree().get_nodes_in_group("enemies")
	
	# 移除已死亡的敌人血条
	for enemy_id in _enemy_health_bars.keys():
		var found = enemies.any(func(e): return str(e.get_instance_id()) == enemy_id)
		if not found:
			var bar = _enemy_health_bars[enemy_id]
			if is_instance_valid(bar):
				bar.queue_free()
			_enemy_health_bars.erase(enemy_id)
	
	# 更新现有血条
	for enemy in enemies:
		var eid = str(enemy.get_instance_id())
		if not _enemy_health_bars.has(eid):
			# 创建新血条
			var bar = _create_enemy_health_bar(enemy)
			enemy_health_container.add_child(bar)
			_enemy_health_bars[eid] = bar
		
		# 更新位置（在敌人头顶）
		var bar = _enemy_health_bars[eid]
		if is_instance_valid(bar) and is_instance_valid(enemy):
			var screen_pos = get_viewport().get_mouse_position()  # 临时用这个
			# 实际应该用 world_to_screen
			bar.global_position = enemy.global_position


func _create_enemy_health_bar(enemy: Node) -> ProgressBar:
	var bar = ProgressBar.new()
	bar.custom_minimum_size = Vector2(80, 8)
	bar.max_value = enemy.max_hp
	bar.value = enemy.current_hp
	bar.name = "EnemyHP_" + str(enemy.get_instance_id())
	
	var style = StyleBoxFlat.new()
	style.bg_color = Color(0.2, 0.2, 0.2, 0.8)
	style.border_width_right = 1
	style.border_width_bottom = 1
	style.border_color = Color(0.8, 0.2, 0.2, 1)
	bar.add_theme_stylebox_override("panel", style)
	
	return bar


func _update_weapon_display():
	# 更新武器状态显示
	var player = get_tree().root.get_node("MainWorld/Player")
	if not player or not player.has_method("get_current_weapon"):
		weapon_panel.visible = false
		return
	
	weapon_panel.visible = true
	
	var weapon = player.get_current_weapon()
	if weapon:
		weapon_name_label.text = weapon.weapon_name
		weapon_ammo_label.text = "弹药: " + weapon.get_ammo_display()
		weapon_cooldown_bar.value = weapon.get_cooldown_percent() * 100


# ==================== 信号处理 ====================

func _on_enemy_spawned(enemy: Node):
	_add_combat_log("⚠️ 敌人出现: " + enemy.enemy_name)


func _on_damage_dealt(attacker: Node2D, defender: Node2D, damage: float):
	if defender.is_in_group("enemies"):
		_add_combat_log("命中 " + defender.enemy_name + " -" + str(damage).pad_decimals(1) + " 伤害")
	elif defender.is_in_group("vehicles"):
		_add_combat_log("受到攻击 -" + str(damage).pad_decimals(1) + " 伤害")


func _on_combat_ended(winner: Node2D, loser: Node2D):
	if loser.is_in_group("enemies"):
		_add_combat_log("击败 " + loser.enemy_name + "！")
		# 增加科技点
		var player = get_tree().root.get_node("MainWorld/Player")
		if player and player.has_method("add_tech_points"):
			player.add_tech_points(10)


func _add_combat_log(message: String):
	_combat_log_messages.append(message)
	if _combat_log_messages.size() > _max_log_messages:
		_combat_log_messages.pop_front()
	
	combat_log.text = "\n".join(_combat_log_messages)
