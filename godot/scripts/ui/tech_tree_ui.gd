# 科技树 UI - v1.2
# 显示所有进化阶段和科技树

extends Control

@onready var panel: PanelContainer = $TechTreePanel
@onready var tree_container: VBoxContainer = $TechTreePanel/VBox/ScrollContainer/TechTreeContainer
@onready var close_button: Button = $TechTreePanel/VBox/CloseButton

var _evolution_system = null


func _ready():
	_evolution_system = get_node_or_null("/root/EvolutionSystem")
	close_button.pressed.connect(_on_close_pressed)
	panel.visible = false


func _on_close_pressed():
	panel.visible = false


func toggle_panel():
	panel.visible = not panel.visible
	if panel.visible:
		_refresh_tree()


func _refresh_tree():
	# 清空现有
	for child in tree_container.get_children():
		child.queue_free()
	
	if not _evolution_system:
		return
	
	# 创建科技树标题
	var title = Label.new()
	title.text = "🌳 科技进化树"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 24)
	tree_container.add_child(title)
	
	# 添加空行
	tree_container.add_child(_create_spacer(20))
	
	# 获取玩家当前阶段
	var player = get_tree().root.get_node_or_null("MainWorld/Player")
	var current_stage = player.vehicle_stage if player else "raft"
	
	# 添加海洋进化线
	_add_evolution_line("🌊 海洋线", ["raft", "canoe", "fisher", "gunboat", "destroyer", "cruiser", "aircraft_carrier"], current_stage)
	
	# 添加分隔
	tree_container.add_child(_create_spacer(30))
	
	# 添加陆地进化线（待解锁）
	_add_evolution_line("🚗 陆地线", ["cart", "wagon", "car", "truck", "tank"], current_stage, false)
	
	# 添加天空进化线（待解锁）
	tree_container.add_child(_create_spacer(30))
	_add_evolution_line("✈️ 天空线", ["glider", "biplane", "jet", "stealth", "mech"], current_stage, false)


func _add_evolution_line(line_name: String, stages: Array, current_stage: String, unlocked: bool = true):
	# 标题
	var line_title = Label.new()
	line_title.text = line_name
	line_title.add_theme_font_size_override("font_size", 18)
	line_title.add_theme_color_override("font_color", Color(0.8, 0.9, 1.0))
	tree_container.add_child(line_title)
	
	# 阶段节点
	var hbox = HBoxContainer.new()
	hbox.alignment = BoxContainer.ALIGNMENT_CENTER
	
	for i in range(stages.size()):
		var stage = stages[i]
		var info = _evolution_system.get_stage_info(stage) if _evolution_system else {}
		var stage_name = info.get("name", stage)
		
		# 创建节点
		var node = _create_stage_node(stage_name, stage, current_stage, i < stages.size() - 1)
		hbox.add_child(node)
		
		# 添加箭头
		if i < stages.size() - 1:
			var arrow = Label.new()
			arrow.text = "→"
			arrow.add_theme_font_size_override("font_size", 20)
			hbox.add_child(arrow)
	
	tree_container.add_child(hbox)


func _create_stage_node(name: String, stage: String, current_stage: String, has_arrow: bool) -> VBoxContainer:
	var vbox = VBoxContainer.new()
	
	# 节点背景
	var panel = PanelContainer.new()
	
	# 根据状态设置颜色
	var current_stage_info = _get_stage_status(stage, current_stage)
	var color = current_stage_info.color
	var status_icon = current_stage_info.icon
	
	var label = Label.new()
	label.text = "%s %s" % [status_icon, name]
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	
	var style = StyleBoxFlat.new()
	style.bg_color = color.darkened(0.5)
	style.border_width_left = 2
	style.border_width_right = 2
	style.border_width_top = 2
	style.border_width_bottom = 2
	style.border_color = color
	style.corner_radius_top_left = 4
	style.corner_radius_top_right = 4
	style.corner_radius_bottom_right = 4
	style.corner_radius_bottom_left = 4
	
	panel.add_theme_stylebox_override("panel", style)
	panel.add_child(label)
	
	vbox.add_child(panel)
	
	return vbox


func _get_stage_status(stage: String, current_stage: String) -> Dictionary:
	if stage == current_stage:
		return {"color": Color(0.2, 0.9, 0.2), "icon": "🔵"}  # 当前阶段
	elif _is_stage_unlocked(stage, current_stage):
		return {"color": Color(0.9, 0.9, 0.2), "icon": "⚪"}  # 已解锁未选择
	else:
		return {"color": Color(0.3, 0.3, 0.3), "icon": "🔒"}  # 未解锁


func _is_stage_unlocked(stage: String, current_stage: String) -> bool:
	var stages_order = ["raft", "canoe", "fisher", "gunboat", "destroyer", "cruiser", "aircraft_carrier"]
	var current_index = stages_order.find(current_stage)
	var stage_index = stages_order.find(stage)
	
	return stage_index <= current_index + 1


func _create_spacer(height: int) -> Control:
	var spacer = Control.new()
	spacer.custom_minimum_size.y = height
	return spacer
