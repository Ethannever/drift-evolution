# miniMax API Provider
# 文档: https://www.minimaxi.com/document

extends Node

var _api_key: String = ""
var _api_base: String = "https://api.minimaxi.chat/v1"

var _is_configured: bool = false


func _ready():
	_load_config()


func _load_config():
	if Config.has_section_key("ai", "minimax", "api_key"):
		_api_key = Config.get_value("ai", "minimax", "api_key")
	if Config.has_section_key("ai", "minimax", "api_base"):
		_api_base = Config.get_value("ai", "minimax", "api_base")
	_is_configured = _api_key != ""


func is_available() -> bool:
	return _is_configured


func generate(prompt: String, context: Dictionary) -> String:
	if not is_available():
		return ""
	
	var url = _api_base + "/text/chatcompletion_v2"
	var headers = [
		"Authorization: Bearer " + _api_key,
		"Content-Type: application/json"
	]
	
	var model = Config.get_value("ai", "minimax", "model", "abab6.5s-chat")
	
	var body = JSON.stringify({
		"model": model,
		"messages": [
			{"role": "system", "content": _get_system_prompt()},
			{"role": "user", "content": prompt}
		],
		"temperature": 0.7,
		"max_tokens": 200
	})
	
	var result = _send_request(url, headers, body)
	if result != "":
		return _parse_response(result)
	return ""


func _get_system_prompt() -> String:
	return """你是一个漂流进化游戏的叙事引擎。
游戏背景：玩家从木筏开始，逐步进化到航母/机甲。
请生成简洁、有沉浸感的游戏内容。
语言：简体中文
风格：航海冒险、生存挑战"""


func _send_request(url: String, headers: Array, body: String) -> String:
	var http = HTTPRequest.new()
	add_child(http)
	
	var error = http.request(url, headers, HTTPClient.METHOD_POST, body)
	if error != OK:
		http.queue_free()
		return ""
	
	var response = await http.request_completed
	http.queue_free()
	
	if response[1] == 200:
		return response[3].get_string_from_utf8()
	return ""


func _parse_response(response: String) -> String:
	# 解析 miniMax 响应格式
	# {"choices": [{"messages": [{"role": "assistant", "content": "..."}]}]}
	var json = JSON.new()
	var parse_result = json.parse(response)
	
	if parse_result == OK:
		var data = json.get_data()
		if data is Dictionary and data.has("choices"):
			var choices = data["choices"]
			if choices.size() > 0 and choices[0] is Dictionary:
				var message = choices[0].get("messages", [])
				if message.size() > 0:
					return message[0].get("content", "")
	return ""
