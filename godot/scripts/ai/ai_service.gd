# AI 服务入口 - 四层降级 + 缓存
# requests → 缓存命中 → 本地生成 → API调用 → 硬编码默认

extends Node

const CACHE_DIR = "user://ai_cache/"
const CACHE_VERSION = "v1"

var _cache: Dictionary = {}
var _providers: Array = []
var _current_provider: Node = null


func _ready():
	_init_cache()
	_init_providers()


func _init_cache():
	DirAccess.make_dir_recursive_absolute(CACHE_DIR)
	_load_cache_index()


func _init_providers():
	# 按优先级添加 providers
	# 1. 本地规则生成（离线可用）
	var local = preload("local_provider.gd").new()
	add_child(local)
	_providers.append(local)
	
	# 2. miniMax API（如果配置了）
	if Config.has_section_key("ai", "provider", "minimax"):
		var minimax = preload("providers/minimax_provider.gd").new()
		add_child(minimax)
		_providers.append(minimax)
	
	# 3. OpenAI/Claude API（如果配置了）
	if Config.has_section_key("ai", "provider", "openai"):
		var openai = preload("providers/openai_provider.gd").new()
		add_child(openai)
		_providers.append(openai)
	
	# 默认使用第一个可用 provider
	_current_provider = _providers[0] if _providers.size() > 0 else null


# ==================== 公共 API ====================

## 生成剧情事件描述
func generate_event_description(context: Dictionary) -> String:
	var prompt = _build_prompt("event", context)
	return _generate_with_fallback(prompt, context)


## 生成物品背景故事
func generate_item_lore(item_data: Dictionary) -> String:
	var prompt = _build_prompt("item_lore", item_data)
	return _generate_with_fallback(prompt, item_data)


## 生成 NPC 对话
func generate_dialogue(npc: Dictionary, player_action: String) -> String:
	var context = {"npc": npc, "action": player_action}
	var prompt = _build_prompt("dialogue", context)
	return _generate_with_fallback(prompt, context)


## 生成世界/地点描述
func generate_location_description(location: Dictionary) -> String:
	var prompt = _build_prompt("location", location)
	return _generate_with_fallback(prompt, location)


## 生成任务目标描述
func generate_mission_briefing(mission: Dictionary) -> String:
	var prompt = _build_prompt("mission", mission)
	return _generate_with_fallback(prompt, mission)


## 批量生成（节省 API 调用）
func generate_batch(requests: Array) -> Array:
	var results: Array = []
	for req in requests:
		var prompt = _build_prompt(req.type, req.context)
		results.append(_generate_with_fallback(prompt, req.context))
	return results


# ==================== 内部方法 ====================

func _build_prompt(template_type: String, context: Dictionary) -> String:
	var template = _get_template(template_type)
	# 简单的模板替换
	var prompt = template
	for key in context:
		prompt = prompt.replace("{" + key + "}", str(context[key]))
	return prompt


func _generate_with_fallback(prompt: String, context: Dictionary) -> String:
	# 1. 检查缓存
	var cache_key = _get_cache_key(prompt)
	if _cache.has(cache_key):
		return _cache[cache_key]
	
	# 2. 尝试各 provider
	for provider in _providers:
		if provider.is_available():
			var result = provider.generate(prompt, context)
			if result != "":
				_cache[cache_key] = result
				_save_cache()
				return result
	
	# 3. 返回硬编码默认值
	return _get_default_text(template_type_from_context(context))


func _get_cache_key(prompt: String) -> String:
	# 使用 prompt 的 hash 作为 key
	return str(prompt.hash())


func _load_cache_index():
	var cache_file = ConfigFile.new()
	var err = cache_file.load(CACHE_DIR + "index.cfg")
	if err == OK:
		_cache = cache_file.get_value(CACHE_VERSION, "entries", {})


func _save_cache():
	var cache_file = ConfigFile.new()
	cache_file.set_value(CACHE_VERSION, "entries", _cache)
	cache_file.save(CACHE_DIR + "index.cfg")


func _get_template(template_type: String) -> String:
	var templates = {
		"event": """生成一个漂流生存游戏的随机事件描述。

情境: {situation}
玩家当前阶段: {player_stage}
资源状态: {resources}

生成一个50字以内的中文事件描述，包含事件结果。""",

		"item_lore": """为一个漂流进化游戏的物品生成背景故事。

物品名称: {item_name}
物品类型: {item_type}
玩家阶段: {player_stage}

生成一个30字以内的中文背景故事。""",

		"dialogue": """生成漂流进化游戏中NPC的对话。

NPC角色: {npc_role}
NPC性格: {npc_personality}
玩家行为: {action}

生成一句NPC的中文对白，20字以内。""",

		"location": """描述漂流进化游戏中的一个地点。

地点类型: {location_type}
环境特征: {features}
危险等级: {danger_level}

生成一个40字以内的中文地点描述。""",

		"mission": """为漂流进化游戏生成任务简报。

任务类型: {mission_type}
目标: {objective}
难度: {difficulty}

生成一个30字以内的中文任务简报。"""
	}
	return templates.get(template_type, "生成内容: {context}")


func _get_default_text(context_type: String) -> String:
	var defaults = {
		"event": "海面上发现了什么...",
		"item_lore": "来历不明的物品",
		"dialogue": "嗯...",
		"location": "一片未知的海域",
		"mission": "探索这片区域"
	}
	return defaults.get(context_type, "...")


func template_type_from_context(context: Dictionary) -> String:
	if context.has("situation"):
		return "event"
	if context.has("item_name"):
		return "item_lore"
	if context.has("npc"):
		return "dialogue"
	if context.has("location_type"):
		return "location"
	if context.has("mission_type"):
		return "mission"
	return "event"
