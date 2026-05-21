# 游戏自主进化系统 - 核心
# 监控游戏状态，触发 AI 内容生成，让游戏自动扩展

extends Node

signal evolution_triggered(evolution_type: String, content: Dictionary)
signal new_content_generated(content_type: String, content: Dictionary)

const EVOLUTION_CONFIG_PATH = "res://configs/evolution_triggers.cfg"
const GENERATED_CONTENT_DIR = "user://generated_content/"

# 进化触发条件
var _triggers: Dictionary = {
	"stage_advance": {"enabled": true, "cooldown": 300},  # 阶段突破后5分钟
	"time_based": {"enabled": true, "interval": 600},    # 每10分钟
	"exploration": {"enabled": true, "new_zone": true},  # 探索新区域
	"player_request": {"enabled": true, "cooldown": 60}, # 玩家请求，1分钟CD
	"death_based": {"enabled": true, "threshold": 5},    # 每死亡5次
}

var _last_evolution_time: Dictionary = {}
var _generated_content: Dictionary = {}
var _ai: Node = null
var _content_registry: Node = null


func _ready():
	_init_directories()
	_load_generated_content()
	_ai = get_node_or_null("/root/AIService")
	_content_registry = get_node_or_null("/root/ContentRegistry")
	
	# 连接信号
	_connect_signals()
	
	# 启动进化检查定时器
	_start_evolution_timer()


func _init_directories():
	DirAccess.make_dir_recursive_absolute(GENERATED_CONTENT_DIR + "items/")
	DirAccess.make_dir_recursive_absolute(GENERATED_CONTENT_DIR + "enemies/")
	DirAccess.make_dir_recursive_absolute(GENERATED_CONTENT_DIR + "events/")


func _load_generated_content():
	var items_file = ConfigFile.new()
	if items_file.load(GENERATED_CONTENT_DIR + "items.cfg") == OK:
		_generated_content["items"] = items_file.get_value("items", "entries", {})
	
	var enemies_file = ConfigFile.new()
	if enemies_file.load(GENERATED_CONTENT_DIR + "enemies.cfg") == OK:
		_generated_content["enemies"] = enemies_file.get_value("enemies", "entries", {})
	
	var events_file = ConfigFile.new()
	if events_file.load(GENERATED_CONTENT_DIR + "events.cfg") == OK:
		_generated_content["events"] = events_file.get_value("events", "entries", {})


func _save_generated_content(content_type: String):
	var config = ConfigFile.new()
	var data = _generated_content.get(content_type, {})
	config.set_value(content_type, "entries", data)
	config.save(GENERATED_CONTENT_DIR + content_type + ".cfg")


func _connect_signals():
	# 连接 GameState 信号
	var game_state = get_node_or_null("/root/GameState")
	if game_state:
		if game_state.has_signal("stage_advanced"):
			game_state.stage_advanced.connect(_on_stage_advanced)
		if game_state.has_signal("player_died"):
			game_state.player_died.connect(_on_player_died)
		if game_state.has_signal("zone_discovered"):
			game_state.zone_discovered.connect(_on_zone_discovered)


func _start_evolution_timer():
	# 每60秒检查一次是否需要进化
	var timer = Timer.new()
	timer.name = "EvolutionTimer"
	timer.wait_time = 60.0
	timer.timeout.connect(_on_evolution_check)
	add_child(timer)
	timer.start()


# ==================== 触发条件 ====================

func _on_stage_advanced(new_stage: String):
	if not _triggers.stage_advance.enabled:
		return
	if _is_in_cooldown("stage_advance"):
		return
	
	print("[Evolution] 玩家突破到阶段: ", new_stage)
	_trigger_evolution("stage_advance", {"new_stage": new_stage})


func _on_player_died(death_count: int):
	if not _triggers.death_based.enabled:
		return
	if death_count % _triggers.death_based.threshold != 0:
		return
	
	print("[Evolution] 玩家死亡次数: ", death_count)
	_trigger_evolution("death_based", {"death_count": death_count})


func _on_zone_discovered(zone_id: String):
	if not _triggers.exploration.enabled:
		return
	
	print("[Evolution] 发现新区域: ", zone_id)
	_trigger_evolution("exploration", {"zone": zone_id})


func _on_evolution_check():
	# 时间触发
	if _triggers.time_based.enabled:
		if _is_in_cooldown("time_based"):
			return
		_trigger_evolution("time_based", {"elapsed": _get_elapsed_time()})


# ==================== 进化执行 ====================

func request_evolution():
	"""玩家主动请求进化生成"""
	if not _triggers.player_request.enabled:
		return {"success": false, "reason": "功能已禁用"}
	if _is_in_cooldown("player_request"):
		return {"success": false, "reason": "冷却中", "cooldown_remaining": _get_cooldown_remaining("player_request")}
	
	_trigger_evolution("player_request", {})
	return {"success": true}


func _trigger_evolution(trigger_type: String, context: Dictionary):
	_set_cooldown(trigger_type)
	
	emit_signal("evolution_triggered", trigger_type, context)
	
	# 并行生成多种内容
	_generate_evolution_content(trigger_type, context)


func _generate_evolution_content(trigger_type: String, context: Dictionary):
	# 1. 生成新物品
	var new_items = _generate_new_items(context)
	for item in new_items:
		_register_content("items", item.id, item)
	
	# 2. 生成新敌人
	var new_enemies = _generate_new_enemies(context)
	for enemy in new_enemies:
		_register_content("enemies", enemy.id, enemy)
	
	# 3. 生成新事件
	var new_events = _generate_new_events(context)
	for event in new_events:
		_register_content("events", event.id, event)
	
	# 4. 检查是否解锁新进化分支
	if trigger_type == "stage_advance":
		_check_evolution_unlock(context)


# ==================== 内容生成 ====================

func _generate_new_items(context: Dictionary) -> Array:
	var count = randi() % 3 + 1  # 每次生成1-3个
	var items = []
	
	for i in range(count):
		var item = {
			"id": "gen_item_%d" % Time.get_unix_time_from_system() + "_%d" % i,
			"name": _generate_item_name(),
			"type": _random_item_type(),
			"quality": _random_quality(),
			"stats": _generate_item_stats(),
			"lore": "",
			"source": "auto_generated",
			"generated_at": Time.get_datetime_string_from_system(),
			"trigger": context
		}
		
		# AI 生成背景故事（如果可用）
		if _ai:
			item.lore = _ai.generate_item_backstory(
				item.name, 
				item.type, 
				context.get("new_stage", "raft")
			)
		
		items.append(item)
		emit_signal("new_content_generated", "item", item)
	
	return items


func _generate_new_enemies(context: Dictionary) -> Array:
	var count = randi() % 2 + 1  # 每次生成1-2个
	var enemies = []
	
	for i in range(count):
		var enemy = {
			"id": "gen_enemy_%d" % Time.get_unix_time_from_system() + "_%d" % i,
			"name": _generate_enemy_name(),
			"type": _random_enemy_type(),
			"hp": randi() % 500 + 100,
			"damage": randi() % 50 + 10,
			"speed": randf() * 2 + 0.5,
			"behavior": _random_enemy_behavior(),
			"drop_table": _generate_drop_table(),
			"source": "auto_generated",
			"generated_at": Time.get_datetime_string_from_system(),
			"trigger": context
		}
		
		enemies.append(enemy)
		emit_signal("new_content_generated", "enemy", enemy)
	
	return enemies


func _generate_new_events(context: Dictionary) -> Array:
	var count = randi() % 2 + 1
	var events = []
	
	for i in range(count):
		var event = {
			"id": "gen_event_%d" % Time.get_unix_time_from_system() + "_%d" % i,
			"title": _generate_event_title(),
			"description": "",
			"type": _random_event_type(),
			"effects": _generate_event_effects(),
			"conditions": {},
			"source": "auto_generated",
			"generated_at": Time.get_datetime_string_from_system(),
			"trigger": context
		}
		
		# AI 生成事件描述
		if _ai:
			var situation = event.title + " " + event.type
			event.description = _ai.generate_event_description({
				"situation": situation,
				"player_stage": context.get("new_stage", "raft"),
				"resources": "未知"
			})
		
		events.append(event)
		emit_signal("new_content_generated", "event", event)
	
	return events


# ==================== 内容注册 ====================

func _register_content(content_type: String, content_id: String, content: Dictionary):
	if not _generated_content.has(content_type):
		_generated_content[content_type] = {}
	
	_generated_content[content_type][content_id] = content
	_save_generated_content(content_type)
	
	# 通知 ContentRegistry
	if _content_registry:
		_content_registry.register_generated_content(content_type, content_id, content)
	
	print("[Evolution] 注册新内容: ", content_type, "/", content_id)


func _check_evolution_unlock(context: Dictionary):
	var new_stage = context.get("new_stage", "")
	
	# 定义阶段解锁规则
	var unlock_map = {
		"canoe": {"new_evolution": "river_technology", "cost": 50},
		"sailboat": {"new_evolution": "wind_navigation", "cost": 100},
		"steamship": {"new_evolution": "industrial_power", "cost": 200},
		"cruiser": {"new_evolution": "military_tactics", "cost": 500},
	}
	
	if unlock_map.has(new_stage):
		var unlock = unlock_map[new_stage]
		_register_content("evolutions", unlock.new_evolution, {
			"id": unlock.new_evolution,
			"unlock_stage": new_stage,
			"cost": unlock.cost,
			"description": "新技术已解锁",
			"source": "auto_generated"
		})


# ==================== 辅助方法 ====================

func _generate_item_name() -> String:
	var prefixes = ["神秘", "古老", "强力", "破损", "精良", "传说", "海洋", "风暴", "雷电", "烈火"]
	var middles = ["的", ""]
	var bases = ["剑", "盾", "弓", "杖", "甲", "靴", "戒指", "项链", "罗盘", "引擎", "锚", "舵"]
	
	return prefixes[randi() % prefixes.size()] + middles[randi() % middles.size()] + bases[randi() % bases.size()]


func _generate_enemy_name() -> String:
	var types = ["海盗船", "幽灵舰", "海兽", "机械鲨鱼", "章鱼怪", "海妖", "水雷群", "深海鱼"]
	var adjectives = ["愤怒的", "饥饿的", "疯狂的", "古老的", "变异的", "机械的"]
	
	return adjectives[randi() % adjectives.size()] + types[randi() % types.size()]


func _generate_event_title() -> String:
	var titles = [
		"海上遭遇", "神秘信号", "沉船遗迹", "风暴来临", 
		"新大陆发现", "洋流异常", "生物群落", "远古沉眠者"
	]
	return titles[randi() % titles.size()]


func _random_item_type() -> String:
	var types = ["weapon", "armor", "tool", "material", "artifact"]
	return types[randi() % types.size()]


func _random_quality() -> String:
	var qualities = ["common", "uncommon", "rare", "epic", "legendary"]
	var weights = [0.5, 0.25, 0.15, 0.07, 0.03]
	var roll = randf()
	var cumulative = 0.0
	
	for i in range(qualities.size()):
		cumulative += weights[i]
		if roll < cumulative:
			return qualities[i]
	return "common"


func _random_enemy_type() -> String:
	var types = ["aggressive", "stealth", "swarm", "boss", "neutral"]
	return types[randi() % types.size()]


func _random_enemy_behavior() -> String:
	var behaviors = ["chase", "patrol", "ambush", "flee_when_hurt", "call_reinforcement"]
	return behaviors[randi() % behaviors.size()]


func _random_event_type() -> String:
	var types = ["positive", "negative", "neutral", "combat", "discovery", "trade"]
	return types[randi() % types.size()]


func _generate_item_stats() -> Dictionary:
	return {
		"damage": randi() % 100 + 10 if randf() < 0.3 else 0,
		"defense": randi() % 50 + 5 if randf() < 0.3 else 0,
		"speed_bonus": randf() * 0.5 if randf() < 0.2 else 0,
		"capacity_bonus": randi() % 20 + 5 if randf() < 0.2 else 0
	}


func _generate_drop_table() -> Dictionary:
	var resources = ["wood", "metal", "cloth", "food", "fuel", "electronic"]
	var drops = {}
	var drop_count = randi() % 3 + 1
	
	for i in range(drop_count):
		var res = resources[randi() % resources.size()]
		drops[res] = randi() % 20 + 5
	
	return drops


func _generate_event_effects() -> Dictionary:
	return {
		"gained": {},
		"lost": {},
		"buffs": [],
		"debuffs": []
	}


# ==================== 冷却管理 ====================

func _is_in_cooldown(trigger_type: String) -> bool:
	if not _last_evolution_time.has(trigger_type):
		return false
	
	var last_time = _last_evolution_time[trigger_type]
	var cooldown = _triggers.get(trigger_type, {}).get("cooldown", 300)
	
	return Time.get_unix_time_from_system() - last_time < cooldown


func _set_cooldown(trigger_type: String):
	_last_evolution_time[trigger_type] = Time.get_unix_time_from_system()


func _get_cooldown_remaining(trigger_type: String) -> float:
	if not _last_evolution_time.has(trigger_type):
		return 0.0
	
	var last_time = _last_evolution_time[trigger_type]
	var cooldown = _triggers.get(trigger_type, {}).get("cooldown", 300)
	var elapsed = Time.get_unix_time_from_system() - last_time
	
	return max(0.0, cooldown - elapsed)


func _get_elapsed_time() -> float:
	return Time.get_unix_time_from_system()


# ==================== 查询接口 ====================

func get_generated_content(content_type: String) -> Dictionary:
	return _generated_content.get(content_type, {})


func get_all_generated_content() -> Dictionary:
	return _generated_content.duplicate()


func get_evolution_log() -> Array:
	var log = []
	for content_type in _generated_content:
		for content_id in _generated_content[content_type]:
			var content = _generated_content[content_type][content_id]
			log.append({
				"type": content_type,
				"id": content_id,
				"name": content.get("name", content.get("title", "未知")),
				"generated_at": content.get("generated_at", "未知"),
				"source": content.get("source", "unknown")
			})
	return log
