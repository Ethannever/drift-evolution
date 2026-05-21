# NPC 对话生成器 - 高级包装
# 管理 NPC 对话状态和历史

extends Node

var _ai: Node = null
var _dialogue_history: Dictionary = {}  # npc_id -> history array


func _ready():
	_ai = get_node("/root/AIService")


func generate_npc_response(npc_id: String, npc_data: Dictionary, player_action: String) -> String:
	"""为 NPC 生成回复"""
	# 获取或初始化对话历史
	if not _dialogue_history.has(npc_id):
		_dialogue_history[npc_id] = []
	
	var history = _dialogue_history[npc_id]
	
	# 构建上下文
	var context = {
		"npc": npc_data,
		"action": player_action,
		"history_length": history.size()
	}
	
	# 生成对话
	var response = _ai.generate_dialogue(npc_data, player_action)
	
	# 记录对话历史（最多保留10条）
	history.append({"role": "player", "content": player_action})
	history.append({"role": "npc", "content": response})
	
	if history.size() > 20:  # 保留最近10轮对话
		history.pop_front()
	
	return response


func generate_trade_dialogue(npc_data: Dictionary, trade_result: String) -> String:
	"""生成交易结果对话"""
	var templates = {
		"accept": [
			"成交！这是你的%s，希望下次还能合作。",
			"好价！拿去吧，祝你航行顺利。",
			"爽快！这笔交易我记住了。"
		],
		"reject": [
			"这个价格太低了，我不能接受。",
			"你是在开玩笑吗？恕不奉陪。",
			"想占我便宜？没门。"
		],
		"counter": [
			"这样吧，各退一步怎么样？",
			"如果你能再加一点，我们可以成交。",
			"这个价格有点为难，要不你再加点？"
		]
	}
	
	var template_set = templates.get(trade_result, templates["accept"])
	var template = template_set[randi() % template_set.size()]
	
	# 生成交易物品描述
	var item = _generate_trade_item_mention()
	return template % item


func generate_combat_dialogue(npc_data: Dictionary, combat_phase: String) -> String:
	"""生成战斗对话"""
	var phase_templates = {
		"start": [
			"哼，既然你想找死，那就成全你！",
			"天堂有路你不走，地狱无门闯进来！",
			"别怪我不客气了！"
		],
		"hit": [
			"就这点本事？",
			"太弱了！",
			"不堪一击！"
		],
		"hurt": [
			"可恶！你会后悔的！",
			"没想到你还有点本事...",
			"别得意太早！"
		],
		"flee": [
			"今日且放过你！",
			"撤！",
			"你会后悔的！"
		],
		"defeat": [
			"可恶...没想到...输给你了...",
			"好身手...我认输了...",
			"算你狠..."
		]
	}
	
	var templates = phase_templates.get(combat_phase, phase_templates["start"])
	return templates[randi() % templates.size()]


func generate_npc_intro(npc_data: Dictionary) -> String:
	"""生成 NPC 首次相遇的介绍"""
	var role = npc_data.get("role", "survivor")
	var name = npc_data.get("name", "陌生人")
	
	var intros = {
		"trader": "%s向你招手：朋友，要不要来看看我的货物？" % name,
		"survivor": "%s从船舱里探出头：有人！太好了...我是%s。" % [name, name],
		"raider": "%s举起武器：此路是我开，此树是我栽！留下买路财！" % name,
		"elder": "%s微笑着点头：年轻的航海者，老朽等你很久了。" % name,
		"researcher": "%s推了推眼镜：哦？新的观察对象来了。我是%s，一个学者。" % [name, name]
	}
	
	return intros.get(role, "%s点了点头：你好，旅行者。" % name)


func clear_history(npc_id: String = ""):
	"""清除对话历史"""
	if npc_id == "":
		_dialogue_history.clear()
	elif _dialogue_history.has(npc_id):
		_dialogue_history.erase(npc_id)


func get_history(npc_id: String) -> Array:
	"""获取对话历史"""
	return _dialogue_history.get(npc_id, [])


# ==================== 内部方法 ====================

func _generate_trade_item_mention() -> String:
	var items = ["这批货物", "这些材料", "这件装备", "这些东西", "这箱宝贝"]
	return items[randi() % items.size()]
