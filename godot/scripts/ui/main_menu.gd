# 主菜单 - v1.0
# 简单的主菜单界面

extends Control

signal start_game
signal continue_game
signal open_settings
signal quit_game

@onready var title_label: Label = $VBoxContainer/TitleLabel
@onready var version_label: Label = $VBoxContainer/VersionLabel
@onready var start_button: Button = $VBoxContainer/StartButton
@onready var continue_button: Button = $VBoxContainer/ContinueButton
@onready var settings_button: Button = $VBoxContainer/SettingsButton
@onready var quit_button: Button = $VBoxContainer/QuitButton


func _ready():
	_connect_signals()
	_check_save_file()
	_set_version_text()


func _connect_signals():
	start_button.pressed.connect(_on_start_pressed)
	continue_button.pressed.connect(_on_continue_pressed)
	settings_button.pressed.connect(_on_settings_pressed)
	quit_button.pressed.connect(_on_quit_pressed)


func _check_save_file():
	# 检查存档是否存在
	var save_exists = FileAccess.file_exists("user://save_game.cfg")
	continue_button.disabled = not save_exists


func _set_version_text():
	version_label.text = "v1.0.0"


func _on_start_pressed():
	print("[Menu] 开始新游戏")
	emit_signal("start_game")
	# 获取过渡节点并执行
	var transition = get_node_or_null("/root/Transition")
	if transition:
		transition.fade_to_scene("res://scenes/world/main_world.tscn")
	else:
		get_tree().change_scene_to_file("res://scenes/world/main_world.tscn")


func _on_continue_pressed():
	print("[Menu] 继续游戏")
	emit_signal("continue_game")
	var transition = get_node_or_null("/root/Transition")
	if transition:
		transition.fade_to_scene("res://scenes/world/main_world.tscn")
	else:
		get_tree().change_scene_to_file("res://scenes/world/main_world.tscn")


func _on_settings_pressed():
	print("[Menu] 打开设置")
	emit_signal("open_settings")
	# TODO: 打开设置面板


func _on_quit_pressed():
	print("[Menu] 退出游戏")
	emit_signal("quit_game")
	get_tree().quit()
