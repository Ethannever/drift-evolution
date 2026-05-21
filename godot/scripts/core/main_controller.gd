# 主场景控制器 - 初始化所有核心系统
# 将 AI Service、ContentRegistry、GameEvolutionSystem 等接入游戏

extends Node2D

var _game_state: Node = null
var _content_registry: Node = null
var _ai_service: Node = null
var _evolution_system: Node = null


func _ready():
	_initialize_core_systems()
	_connect_evolution_signals()
	_load_game()


func _initialize_core_systems():
	# 确保核心系统已作为 autoload 或 child 存在
	_game_state = get_node_or_null("/root/GameState")
	if not _game_state:
		_game_state = preload("res://scripts/core/game_state.gd").new()
		_game_state.name = "GameState"
		get_node("/root").add_child(_game_state)
	
	_content_registry = get_node_or_null("/root/ContentRegistry")
	if not _content_registry:
		_content_registry = preload("res://scripts/core/content_registry.gd").new()
		_content_registry.name = "ContentRegistry"
		get_node("/root").add_child(_content_registry)
	
	_ai_service = get_node_or_null("/root/AIService")
	if not _ai_service:
		_ai_service = preload("res://scripts/ai/ai_service.gd").new()
		_ai_service.name = "AIService"
		get_node("/root").add_child(_ai_service)
	
	_evolution_system = get_node_or_null("/root/GameEvolutionSystem")
	if not _evolution_system:
		_evolution_system = preload("res://scripts/core/game_evolution_system.gd").new()
		_evolution_system.name = "GameEvolutionSystem"
		get_node("/root").add_child(_evolution_system)


func _connect_evolution_signals():
	if _evolution_system:
		_evolution_system.evolution_triggered.connect(_on_evolution_triggered)
		_evolution_system.new_content_generated.connect(_on_new_content_generated)


func _on_evolution_triggered(evolution_type: String, context: Dictionary):
	print("[Main] 进化触发: ", evolution_type)
	# 可以在此显示 UI 提示玩家
	_show_evolution_notification(evolution_type, context)


func _on_new_content_generated(content_type: String, content: Dictionary):
	print("[Main] 新内容生成: ", content_type, " - ", content.get("name", content.get("title", "?")))
	# 可以在此显示获取新物品的动画


func _show_evolution_notification(evolution_type: String, context: Dictionary):
	# 这里可以连接 UI 系统显示通知
	# 例如：_ui.show_notification("游戏正在自主进化...")
	pass


# ==================== 存档相关 ====================

func _load_game():
	# 读取存档并恢复状态
	var save_file = ConfigFile.new()
	if save_file.load("user://save_game.cfg") == OK:
		var game_data = save_file.get_value("game", "state", {})
		_game_state.load_save_data(game_data)
		print("[Main] 游戏已加载")


func save_game():
	var save_file = ConfigFile.new()
	save_file.set_value("game", "state", _game_state.get_save_data())
	save_file.set_value("game", "saved_at", Time.get_datetime_string_from_system())
	save_file.save("user://save_game.cfg")
	print("[Main] 游戏已保存")


# ==================== 调试接口 ====================

func debug_trigger_evolution():
	"""调试：手动触发一次进化"""
	if _evolution_system:
		var result = _evolution_system.request_evolution()
		print("[Debug] 手动进化: ", result)
		return result
	return {"success": false, "reason": "Evolution system not ready"}


func debug_get_content_stats():
	"""调试：获取内容统计"""
	if _content_registry:
		return _content_registry.get_content_stats()
	return {}


func debug_get_evolution_log():
	"""调试：获取进化日志"""
	if _evolution_system:
		return _evolution_system.get_evolution_log()
	return []
