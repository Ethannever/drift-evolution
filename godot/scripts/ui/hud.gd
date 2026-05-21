# HUD 脚本 - v1.0
# 显示载具状态和物资

extends Control

@onready var hp_bar: ProgressBar = $VBoxContainer/TopBar/HPBar
@onready var hp_label: Label = $VBoxContainer/TopBar/HPLabel
@onready var speed_label: Label = $VBoxContainer/TopBar/SpeedLabel
@onready var cargo_label: Label = $VBoxContainer/TopBar/CargoLabel
@onready var inventory_container: VBoxContainer = $VBoxContainer/LeftPanel/InventoryContainer
@onready var stage_label: Label = $VBoxContainer/LeftPanel/StageLabel

var _player: Node = null


func _ready():
	# 延迟获取玩家引用
	await get_tree().create_timer(0.5).timeout
	_player = get_node_or_null("/root/MainWorld/Player")
	
	if _player:
		_player = _player  # 已有引用
	else:
		# 尝试在场景中查找
		var nodes = get_tree().get_nodes_in_group("vehicles")
		if nodes.size() > 0:
			_player = nodes[0]


func _process(delta: float):
	if not _player:
		return
	
	_update_hp_bar()
	_update_labels()


func _update_hp_bar():
	if not _player:
		return
	
	var hp_percent = _player.get_hp_percent()
	hp_bar.value = hp_percent * 100
	
	# 颜色变化
	if hp_percent > 0.6:
		hp_bar.modulate = Color.GREEN
	elif hp_percent > 0.3:
		hp_bar.modulate = Color.YELLOW
	else:
		hp_bar.modulate = Color.RED


func _update_labels():
	if not _player:
		return
	
	hp_label.text = "HP: %d/%d" % [_player.current_hp, _player.max_hp]
	
	# 速度显示
	speed_label.text = "速度: %.1f" % _player.speed
	
	# 货物容量
	var cargo_used = _player.get_inventory_total()
	var cargo_max = _player.cargo_capacity
	cargo_label.text = "货物: %d/%d" % [cargo_used, cargo_max]
	
	# 当前阶段
	stage_label.text = "阶段: %s" % _player.vehicle_stage
	
	# 更新物资显示
	_update_inventory_display()


func _update_inventory_display():
	if not _player:
		return
	
	# 清空现有显示
	for child in inventory_container.get_children():
		child.queue_free()
	
	# 显示每种物资
	for item_type in _player.inventory.keys():
		var amount = _player.inventory[item_type]
		if amount > 0:
			var label = Label.new()
			label.text = "  %s: %d" % [item_type, amount]
			label.add_theme_font_size_override("font_size", 14)
			inventory_container.add_child(label)


func set_player(player: Node):
	_player = player
