# 进化面板 UI - v1.2
# 显示可用的进化选项和消耗

extends Control

signal evolution_requested(target_stage: String)
signal panel_closed

@onready var panel: PanelContainer = $EvolutionPanel
@onready var current_stage_label: Label = $EvolutionPanel/VBox/CurrentStageLabel
@onready var tech_points_label: Label = $EvolutionPanel/VBox/TechPointsLabel
@onready var evolution_options: VBoxContainer = $EvolutionPanel/VBox/ScrollContainer/EvolutionOptions
@onready var close_button: Button = $EvolutionPanel/VBox/CloseButton

var _evolution_system = null
var _current_vehicle = null


func _ready():
	_evolution_system = get_node_or_null("/root/EvolutionSystem")
	
	close_button.pressed.connect(_on_close_pressed)
	
	panel.visible = false


func _process(delta: float):
	if panel.visible:
		_refresh_display()


func show_panel(vehicle: Node):
	_current_vehicle = vehicle
	panel.visible = true
	_refresh_display()


func hide_panel():
	panel.visible = false
	emit_signal("panel_closed")


func _refresh_display():
	if not _evolution_system or not _current_vehicle:
		return
	
	# 显示当前阶段
	var current_stage = _current_vehicle.vehicle_stage
	var stage_info = _evolution_system.get_stage_info(current_stage)
	current_stage_label.text = "当前: %s" % stage_info.get("name", current_stage)
	
	# 显示科技点
	tech_points_label.text = "科技点: %d" % _current_vehicle.tech_points
	
	# 清空并刷新进化选项
	for child in evolution_options.get_children():
		child.queue_free()
	
	var options = _evolution_system.get_available_evolutions(current_stage)
	
	if options.size() == 0:
		var no_option = Label.new()
		no_option.text = "已到达最高阶段！"
		no_option.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		evolution_options.add_child(no_option)
		return
	
	for option in options:
		var option_item = _create_evolution_option(option)
		evolution_options.add_child(option_item)


func _create_evolution_option(option: Dictionary) -> PanelContainer:
	var panel_item = PanelContainer.new()
	
	var hbox = HBoxContainer.new()
	panel_item.add_child(hbox)
	
	# 左侧：名称和描述
	var vbox = VBoxContainer.new()
	vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	
	var name_label = Label.new()
	name_label.text = "→ %s" % option.name
	name_label.add_theme_font_size_override("font_size", 18)
	vbox.add_child(name_label)
	
	var desc_label = Label.new()
	desc_label.text = option.description
	desc_label.autowrap_mode = TextServer.AUTOWRAP_WORD
	desc_label.custom_minimum_size.y = 30
	vbox.add_child(desc_label)
	
	# 显示消耗
	var cost_label = Label.new()
	var cost = option.get("cost", {})
	var cost_text = ""
	for resource in cost:
		cost_text += "%s: %s  " % [resource, str(cost[resource])]
	cost_label.text = "消耗: " + cost_text if cost_text else ""
	cost_label.add_theme_color_override("font_color", Color(0.8, 0.6, 0.2))
	vbox.add_child(cost_label)
	
	# 显示属性预览
	var stats = option.get("stats_preview", {})
	var stats_label = Label.new()
	stats_label.text = "属性: HP %d | 速度 %d | 容量 %d" % [
		stats.get("hp", 0),
		stats.get("speed", 0),
		stats.get("cargo", 0)
	]
	stats_label.add_theme_color_override("font_color", Color(0.6, 0.8, 0.6))
	vbox.add_child(stats_label)
	
	hbox.add_child(vbox)
	
	# 右侧：进化按钮
	var evolve_button = Button.new()
	evolve_button.text = "进化"
	evolve_button.custom_minimum_size = Vector2(80, 40)
	
	var target_stage = option.stage
	evolve_button.pressed.connect(func(): _on_evolve_pressed(target_stage))
	
	# 检查是否可以进化
	var can_evolve = _evolution_system.can_evolve(_current_vehicle, target_stage)
	evolve_button.disabled = not can_evolve.can_evolve
	
	if not can_evolve.can_evolve:
		evolve_button.tooltip_text = can_evolve.reason
	
	hbox.add_child(evolve_button)
	
	return panel_item


func _on_evolve_pressed(target_stage: String):
	if not _evolution_system or not _current_vehicle:
		return
	
	var result = _evolution_system.request_evolution(_current_vehicle, target_stage)
	
	if result.get("success", false):
		# 进化成功，关闭面板
		hide_panel()
		
		# 通知玩家
		print("[EvolutionUI] 进化成功！")
	else:
		# 进化失败，显示原因
		var reason = result.get("reason", "进化失败")
		var error_label = Label.new()
		error_label.text = reason
		error_label.add_theme_color_override("font_color", Color.RED)
		
		# 添加到选项中
		evolution_options.add_child(error_label)
		
		# 3秒后移除
		await get_tree().create_timer(3.0).timeout
		if is_instance_valid(error_label):
			error_label.queue_free()


func _on_close_pressed():
	hide_panel()


func toggle_panel(vehicle: Node = null):
	if panel.visible:
		hide_panel()
	else:
		if vehicle:
			show_panel(vehicle)
		else:
			# 尝试获取玩家
			var player = get_tree().root.get_node_or_null("MainWorld/Player")
			if player:
				show_panel(player)
