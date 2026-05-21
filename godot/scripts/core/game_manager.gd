# 游戏主控制器 - v1.0
# 管理游戏主循环和状态

extends Node2D

signal game_paused
signal game_resumed
signal game_over

var _is_paused: bool = false
var _player: Node = null


func _ready():
	_init_player()
	_init_systems()
	_load_game()
	print("[Game] v1.0 主世界已加载")


func _init_player():
	# 查找或创建玩家
	_player = get_node_or_null("Player")
	if not _player:
		# 如果场景中没有玩家，创建默认载具
		print("[Game] 未找到玩家载具，请在场景中添加")


func _init_systems():
	# 初始化其他系统
	pass


func _process(delta: float):
	if Input.is_action_just_pressed("ui_cancel"):
		_toggle_pause()


func _toggle_pause():
	_is_paused = not _is_paused
	
	if _is_paused:
		get_tree().paused = true
		emit_signal("game_paused")
		_show_pause_menu()
	else:
		get_tree().paused = false
		emit_signal("game_resumed")
		_hide_pause_menu()


func _show_pause_menu():
	# 显示暂停菜单
	pass


func _hide_pause_menu():
	# 隐藏暂停菜单
	pass


func _load_game():
	# 读取存档
	var save_file = ConfigFile.new()
	if save_file.load("user://save_game.cfg") == OK:
		var player_data = save_file.get_value("game", "player", {})
		if _player and player_data.size() > 0:
			_player.load_save_data(player_data)
		print("[Game] 存档已加载")


func save_game():
	# 保存游戏
	var save_file = ConfigFile.new()
	
	if _player:
		save_file.set_value("game", "player", _player.get_save_data())
	
	save_file.set_value("game", "saved_at", Time.get_datetime_string_from_system())
	save_file.set_value("game", "version", "1.0.0")
	
	save_file.save("user://save_game.cfg")
	print("[Game] 游戏已保存")


func _on_player_destroyed():
	emit_signal("game_over")
	_show_game_over()


func _show_game_over():
	var overlay = ColorRect.new()
	overlay.name = "GameOverOverlay"
	overlay.color = Color(0, 0, 0, 0.7)
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(overlay)
	
	var label = Label.new()
	label.name = "GameOverLabel"
	label.text = "游戏结束\n\n载具已被摧毁"
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.set_anchors_preset(Control.PRESET_FULL_RECT)
	label.add_theme_font_size_override("font_size", 32)
	overlay.add_child(label)
