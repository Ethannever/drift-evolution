# 内容注册中心 - 统管所有游戏内容
# 包括静态配置 + AI动态生成内容

extends Node

signal content_registered(content_type: String, content_id: String, content: Dictionary)
signal content_updated(content_type: String, content_id: String, content: Dictionary)

var _content: Dictionary = {
	"items": {},
	"enemies": {},
	"events": {},
	"evolutions": {},
	"zones": {}
}

var _config_dir: String = "res://configs/"
var _generated_dir: String = "user://generated_content/"


func _ready():
	_load_static_content()
	_load_generated_content()


# ==================== 加载 ====================

func _load_static_content():
	# 加载静态配置
	_load_config_file("items.cfg", "items")
	_load_config_file("enemies.cfg", "enemies")
	_load_config_file("events.cfg", "events")
	_load_config_file("evolutions.cfg", "evolutions")
	_load_config_file("zones.cfg", "zones")


func _load_generated_content():
	# 加载 AI 生成的内容（覆盖同名静态内容）
	_load_config_file(_generated_dir + "items.cfg", "items")
	_load_config_file(_generated_dir + "enemies.cfg", "enemies")
	_load_config_file(_generated_dir + "events.cfg", "events")
	_load_config_file(_generated_dir + "evolutions.cfg", "evolutions")


func _load_config_file(file_path: String, content_type: String):
	var config = ConfigFile.new()
	var err = config.load(file_path)
	
	if err == OK:
		var entries = config.get_value(content_type, "entries", {})
		for key in entries:
			_register_content_internal(content_type, key, entries[key], false)


# ==================== 注册 ====================

func register_content(content_type: String, content_id: String, content: Dictionary):
	_register_content_internal(content_type, content_id, content, true)


func register_generated_content(content_type: String, content_id: String, content: Dictionary):
	_register_content_internal(content_type, content_id, content, true)
	# 同时保存到生成目录
	_save_to_generated_dir(content_type, content_id, content)


func _register_content_internal(content_type: String, content_id: String, content: Dictionary, emit_signal_flag: bool = true):
	if not _content.has(content_type):
		_content[content_type] = {}
	
	var is_update = _content[content_type].has(content_id)
	_content[content_type][content_id] = content
	
	if emit_signal_flag:
		if is_update:
			emit_signal("content_updated", content_type, content_id, content)
		else:
			emit_signal("content_registered", content_type, content_id, content)


func _save_to_generated_dir(content_type: String, content_id: String, content: Dictionary):
	var config = ConfigFile.new()
	var file_path = _generated_dir + content_type + ".cfg"
	
	if config.load(file_path) == OK:
		_content[content_type] = config.get_value(content_type, "entries", {})
	
	_content[content_type][content_id] = content
	config.set_value(content_type, "entries", _content[content_type])
	config.save(file_path)


# ==================== 查询 ====================

func get_content(content_type: String, content_id: String) -> Dictionary:
	return _content.get(content_type, {}).get(content_id, {})


func get_all_content(content_type: String) -> Dictionary:
	return _content.get(content_type, {}).duplicate(true)


func get_content_by_filter(content_type: String, filter: Callable) -> Array:
	var result = []
	var content_dict = _content.get(content_type, {})
	
	for key in content_dict:
		if filter.call(content_dict[key]):
			result.append(content_dict[key])
	
	return result


func has_content(content_type: String, content_id: String) -> bool:
	return _content.get(content_type, {}).has(content_id)


func get_content_count(content_type: String) -> int:
	return _content.get(content_type, {}).size()


func get_all_content_types() -> Array:
	return _content.keys()


# ==================== 随机获取 ====================

func get_random_item(min_quality: String = "common") -> Dictionary:
	var items = get_all_content("items")
	var quality_order = ["common", "uncommon", "rare", "epic", "legendary"]
	var min_idx = quality_order.find(min_quality)
	
	var valid_items = []
	for key in items:
		var item = items[key]
		var item_quality = item.get("quality", "common")
		var item_idx = quality_order.find(item_quality)
		if item_idx >= min_idx:
			valid_items.append(item)
	
	if valid_items.size() == 0:
		return {}
	
	return valid_items[randi() % valid_items.size()]


func get_random_enemy(zone_difficulty: int = 1) -> Dictionary:
	var enemies = get_all_content("enemies")
	var valid_enemies = []
	
	for key in enemies:
		var enemy = enemies[key]
		var enemy_difficulty = enemy.get("difficulty", 1)
		if enemy_difficulty <= zone_difficulty * 2:
			valid_enemies.append(enemy)
	
	if valid_enemies.size() == 0:
		return {}
	
	return valid_enemies[randi() % valid_enemies.size()]


func get_random_event(event_type: String = "") -> Dictionary:
	var events = get_all_content("events")
	var valid_events = []
	
	for key in events:
		var event = events[key]
		if event_type == "" or event.get("type", "") == event_type:
			valid_events.append(event)
	
	if valid_events.size() == 0:
		return {}
	
	return valid_events[randi() % valid_events.size()]


# ==================== 工具 ====================

func clear_generated_content():
	"""清除所有 AI 生成的内容（重置游戏）"""
	var types = ["items", "enemies", "events", "evolutions"]
	for content_type in types:
		_content[content_type].clear()
		_load_config_file(_config_dir + content_type + ".cfg", content_type)


func get_content_stats() -> Dictionary:
	var stats = {}
	for content_type in _content:
		stats[content_type] = _content[content_type].size()
	return stats
