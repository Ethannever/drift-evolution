# 本地规则生成器 - 离线可用
# 基于模板 + 规则库生成内容，不依赖网络

extends Node

var _event_templates: Array = []
var _item_lore_templates: Array = []
var _dialogue_templates: Dictionary = {}
var _location_templates: Array = []


func _ready():
	_load_templates()


func _load_templates():
	# ===== 事件模板 =====
	_event_templates = [
		{"template": "海上发现了一个漂浮的箱子，打开后获得了{resource}", "type": "positive"},
		{"template": "遭遇了突如其来的风暴，损失了部分物资", "type": "negative"},
		{"template": "在礁石旁发现了野生的{source}，采集了{amount}单位", "type": "positive"},
		{"template": "遇到了一艘废弃的{vehicle}，可以拆解利用", "type": "positive"},
		{"template": "被一群海上强盗发现了，战斗中损失了{loss}", "type": "negative"},
		{"template": "发现了一个神秘的小岛，上面有古老的遗迹", "type": "neutral"},
		{"template": "海面平静，捕到了大量的鱼", "type": "positive"},
		{"template": "洋流将你带到了陌生的海域", "type": "neutral"},
		{"template": "天气骤变，，不得不放弃当前的捕捞计划", "type": "negative"},
		{"template": "远方发现了其他幸存者的信号...", "type": "neutral"},
	]
	
	# ===== 物品背景模板 =====
	_item_lore_templates = [
		"这块碎片来自一艘沉没的古船，上面刻着神秘的符文。",
		"在一次风暴后被冲上了岸，似乎已经漂流了很久。",
		"这是上古文明的遗物，拥有不凡的力量。",
		"曾经属于一位勇敢的航海家，如今传承到你手中。",
		"在废弃的灯塔里发现的，不知是谁将它留在这里。",
		"这块材料来自坠落的天空之城，蕴含着特殊的能量。",
		"海底遗迹中打捞出来的，还带着海水的气息。",
		"前任主人因它而得名，如今你成为了新的守护者。",
	]
	
	# ===== NPC 对话模板 =====
	_dialogue_templates = {
		"trader": {
			"greet": ["哟，旅行者，想要做点交易吗？", "稀客啊，想要点什么？", "欢迎光临，看看有什么需要的。"],
			"accept": ["成交！这可是我给出的最高价了。", "好说，好说。", "痛快！希望下次还能合作。"],
			"reject": ["不划算？那下次再来吧。", "也许以后会有更好的机会。", "可惜了，有需要随时回来。"],
			"combat": ["既然谈不拢，那就用拳头说话！", "你以为我会怕你？", "敬酒不吃吃罚酒！"],
		},
		"survivor": {
			"greet": ["还有人活着！太好了...", "你是...幸存者吗？", "终于遇到同伴了..."],
			"accept": ["太感谢了！我永远不会忘记你的恩情。", "这份恩情我记下了。", "谢谢你陌生人..."],
			"reject": ["没关系，我理解...", "唉...没关系", "也许这就是命吧..."],
			"combat": ["别逼我！我不想伤害你...", "为什么要这样对我...", "别过来！"],
		},
		"raider": {
			"greet": ["哟，又一个送财童子...", "这片海域是我们的，识相的就留下买路财！", "嘿嘿...看起来很有钱啊。"],
			"accept": ["算你识相，滚吧！", "算你识相！", "算你识相，下次记得带更多。"],
			"reject": ["不给？那就别怪我不客气了！", "想跑？没那么容易！", "天堂有路你不走，地狱无门你闯进来！"],
			"combat": ["废话少说！", "动手！", "去死吧！"],
		},
		"elder": {
			"greet": ["年轻人，你终于来了...", "远方的旅行者，你好啊。", "我等你很久了..."],
			"accept": ["很好，你做出了明智的选择。", "记住，海洋会回报善良的人。", "愿风浪与你同行。"],
			"reject": ["可惜了，机会只有一次...", "你会后悔的...", "也许命运另有安排..."],
			"combat": ["我不愿动手，但别逼我...", "你会后悔的...", "年轻人不要太气盛！"],
		}
	}
	
	# ===== 地点描述模板 =====
	_location_templates = [
		{"type": "island", "desc": "一座被茂密植被覆盖的小岛，海滩上散落着奇异的贝壳。"},
		{"type": "reef", "desc": "暗礁密布的危险海域，水下隐藏着锋利的珊瑚。"},
		{"type": "current", "desc": "强大的洋流交汇处，海水呈现出奇异的颜色。"},
		{"type": "wreck", "desc": "沉船残骸散落的海域，隐约能看到船体的轮廓。"},
		{"type": "storm", "desc": "乌云密布，雷声隆隆，一场风暴正在酝酿。"},
		{"type": "calm", "desc": "平静如镜的海面，远处能看到海豚的身影。"},
		{"type": "port", "desc": "废弃的海上平台，铁锈斑驳但结构依然稳固。"},
		{"type": "abyss", "desc": "深不见眼的漆黑海域，似乎隐藏着未知的危险。"},
	]


func is_available() -> bool:
	# 本地生成器永远可用
	return true


func generate(prompt: String, context: Dictionary) -> String:
	# 根据 prompt 类型分发到不同的生成器
	if "event" in prompt:
		return _generate_event(context)
	elif "item_lore" in prompt:
		return _generate_item_lore(context)
	elif "dialogue" in prompt:
		return _generate_dialogue(context)
	elif "location" in prompt:
		return _generate_location(context)
	elif "mission" in prompt:
		return _generate_mission(context)
	return ""


func _generate_event(context: Dictionary) -> String:
	var templates = _event_templates
	var tpl = templates[randi() % templates.size()]
	var text = tpl.template
	
	# 替换变量
	var replacements = {
		"resource": _random_resource(),
		"source": _random_source(),
		"amount": str(randi() % 50 + 10),
		"vehicle": _random_vehicle(),
		"loss": _random_loss(),
	}
	
	for key in replacements:
		text = text.replace(key, replacements[key])
	
	return text


func _generate_item_lore(context: Dictionary) -> String:
	var templates = _item_lore_templates
	return templates[randi() % templates.size()]


func _generate_dialogue(context: Dictionary) -> String:
	var npc = context.get("npc", {})
	var npc_role = npc.get("role", "survivor")
	var action = context.get("action", "greet")
	
	var role_templates = _dialogue_templates.get(npc_role, _dialogue_templates["survivor"])
	var lines = role_templates.get(action, role_templates["greet"])
	
	return lines[randi() % lines.size()]


func _generate_location(context: Dictionary) -> String:
	var templates = _location_templates
	var loc = templates[randi() % templates.size()]
	return loc.desc


func _generate_mission(context: Dictionary) -> String:
	var mission_type = context.get("mission_type", "explore")
	var objective = context.get("objective", "未知目标")
	
	var mission_templates = {
		"explore": "探索" + objective + "区域",
		"collect": "收集" + objective + "资源",
		"combat": "击败" + objective,
		"escort": "护送" + objective + "到达目的地",
		"survive": "在" + objective + "存活一定时间",
	}
	
	return mission_templates.get(mission_type, "探索" + objective)


# ==================== 随机辅助 ====================

func _random_resource() -> String:
	var resources = ["木材", "金属", "布料", "食物", "淡水", "燃料", "矿石", "香料"]
	return resources[randi() % resources.size()]


func _random_source() -> String:
	var sources = ["海藻", "浮木", "贝壳", "海棉", "珊瑚", "海胆", "珍珠"]
	return sources[randi() % sources.size()]


func _random_vehicle() -> String:
	var vehicles = ["渔船", "货船", "游艇", "帆船", "木筏", "气垫船"]
	return vehicles[randi() % vehicles.size()]


func _random_loss() -> String:
	var losses = ["部分食物", "淡水储备", "修船材料", "渔网", "绳索"]
	return losses[randi() % losses.size()]
