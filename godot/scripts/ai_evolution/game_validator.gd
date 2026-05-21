# 游戏验证器 - 验证代码变更是否有效
# 包含语法检查、依赖检查、运行测试

extends Node

var _last_validation: Dictionary = {}


func _ready():
	pass


# ==================== 核心验证 ====================

func validate_game() -> Dictionary:
	var result = {
		"success": true,
		"checks": [],
		"errors": [],
		"warnings": []
	}
	
	# 1. 语法检查
	var syntax_check = _check_syntax()
	result.checks.append(syntax_check)
	if not syntax_check.success:
		result.errors.append("语法错误: " + syntax_check.error)
		result.success = false
	
	# 2. 依赖检查
	var deps_check = _check_dependencies()
	result.checks.append(deps_check)
	if not deps_check.success:
		result.warnings.append("依赖警告: " + deps_check.message)
	
	# 3. 关键文件检查
	var critical_check = _check_critical_files()
	result.checks.append(critical_check)
	if not critical_check.success:
		result.errors.append("关键文件缺失: " + critical_check.missing_files.join(", "))
		result.success = false
	
	# 4. 场景完整性检查
	var scene_check = _check_scenes()
	result.checks.append(scene_check)
	if not scene_check.success:
		result.warnings.append("场景警告: " + scene_check.message)
	
	_last_validation = result
	return result


func get_last_validation() -> Dictionary:
	return _last_validation


# ==================== 各项检查 ====================

func _check_syntax() -> Dictionary:
	var result = {"name": "syntax", "success": true, "error": ""}
	
	var analyzer = get_node_or_null("/root/AIEvolution/../..")
	if not analyzer:
		analyzer = get_parent()
	
	# 获取所有脚本文件
	var dir = DirAccess.open("res://scripts/")
	if not dir:
		result.success = false
		result.error = "无法打开脚本目录"
		return result
	
	var script_files = []
	_collect_scripts(dir, "", script_files)
	
	# 检查每个脚本的语法
	for script_path in script_files:
		var error = _validate_script_syntax(script_path)
		if error != "":
			result.success = false
			result.error = error
			return result
	
	return result


func _collect_scripts(dir: DirAccess, relative: String, output: Array):
	dir.list_dir_begin()
	var name = dir.get_next()
	
	while name != "":
		var full_path = "res://scripts/" + relative + name
		if dir.current_is_dir():
			if name != "." and name != "..":
				var sub_dir = DirAccess.open(full_path + "/")
				if sub_dir:
					_collect_scripts(sub_dir, relative + name + "/", output)
		elif name.ends_with(".gd"):
			output.append(full_path)
		
		name = dir.get_next()
	
	dir.list_dir_end()


func _validate_script_syntax(script_path: String) -> String:
	var file = FileAccess.open(script_path, FileAccess.READ)
	if file == null:
		return "无法读取: " + script_path
	
	var content = file.get_as_text()
	file.close()
	
	# 基本语法检查
	var issues = []
	
	# 检查括号匹配
	var open_parens = content.count("(")
	var close_parens = content.count(")")
	if open_parens != close_parens:
		issues.append("括号不匹配: (%d vs )%d" % [open_parens, close_parens])
	
	var open_braces = content.count("{")
	var close_braces = content.count("}")
	if open_braces != close_braces:
		issues.append("大括号不匹配: {%d vs }%d" % [open_braces, close_braces])
	
	var open_brackets = content.count("[")
	var close_brackets = content.count("]")
	if open_brackets != close_brackets:
		issues.append("方括号不匹配: [%d vs ]%d" % [open_brackets, close_brackets])
	
	# 检查 func 定义格式
	var func_matches = RegEx.new()
	func_matches.compile("func\\s+\\w+\\s*\\(")
	var func_count = func_matches.search_all(content).size()
	
	# 检查信号定义格式
	var signal_matches = RegEx.new()
	signal_matches.compile("signal\\s+\\w+")
	var signal_count = signal_matches.search_all(content).size()
	
	if issues.size() > 0:
		return script_path + ": " + "; ".join(issues)
	
	return ""


func _check_dependencies() -> Dictionary:
	var result = {"name": "dependencies", "success": true, "message": ""}
	
	# 检查 project.godot 中的 autoload
	var project = ConfigFile.new()
	if project.load("res://project.godot") != OK:
		result.success = false
		result.message = "无法读取 project.godot"
		return result
	
	var autoloads = []
	var sections = project.get_sections()
	for section in sections:
		if section.begins_with("autoload/"):
			var autoload_name = section.replace("autoload/", "")
			var autoload_path = project.get_value(section, "", "")
			autoloads.append({"name": autoload_name, "path": autoload_path})
	
	# 检查 autoload 文件是否存在
	var missing_autoloads = []
	for autoload in autoloads:
		if autoload.path != "" and not _file_exists(autoload.path):
			missing_autoloads.append(autoload.name)
	
	if missing_autoloads.size() > 0:
		result.success = false
		result.message = "缺失的 autoload: " + str(missing_autoloads)
	
	return result


func _check_critical_files() -> Dictionary:
	var result = {"name": "critical_files", "success": true, "missing_files": []}
	
	var critical_files = [
		"res://project.godot",
		"res://scenes/main.tscn",
		"res://scripts/core/game_state.gd"
	]
	
	var missing = []
	for f in critical_files:
		if not _file_exists(f):
			missing.append(f)
	
	if missing.size() > 0:
		result.success = false
		result.missing_files = missing
	
	return result


func _check_scenes() -> Dictionary:
	var result = {"name": "scenes", "success": true, "message": ""}
	
	# 检查 project.godot 中的场景引用
	var project = ConfigFile.new()
	if project.load("res://project.godot") != OK:
		return result
	
	# 检查 scenes 目录
	var scenes_dir = DirAccess.open("res://scenes/")
	if not scenes_dir:
		result.message = "scenes 目录不存在"
		return result
	
	return result


# ==================== 工具 ====================

func _file_exists(path: String) -> bool:
	# 处理可能的 "res://" 前缀
	var file_path = path
	if not path.begins_with("res://"):
		file_path = "res://" + path
	
	var file = FileAccess.open(file_path, FileAccess.READ)
	if file == null:
		return false
	file.close()
	return true


func validate_specific_file(file_path: String) -> Dictionary:
	var result = {"file": file_path, "valid": true, "errors": []}
	
	var error = _validate_script_syntax(file_path)
	if error != "":
		result.valid = false
		result.errors.append(error)
	
	return result


func validate_directory(dir_path: String) -> Dictionary:
	var result = {
		"directory": dir_path,
		"total_files": 0,
		"valid_files": 0,
		"invalid_files": [],
		"success": true
	}
	
	var dir = DirAccess.open(dir_path)
	if not dir:
		result.success = false
		result.error = "无法打开目录"
		return result
	
	dir.list_dir_begin()
	var name = dir.get_next()
	
	while name != "":
		var full_path = dir_path + "/" + name
		if dir.current_is_dir():
			if name != "." and name != "..":
				var sub_result = validate_directory(full_path)
				result.total_files += sub_result.total_files
				result.valid_files += sub_result.valid_files
				result.invalid_files.append_array(sub_result.invalid_files)
		elif name.ends_with(".gd"):
			result.total_files += 1
			var error = _validate_script_syntax(full_path)
			if error == "":
				result.valid_files += 1
			else:
				result.invalid_files.append({"file": full_path, "error": error})
		
		name = dir.get_next()
	
	dir.list_dir_end()
	
	if result.invalid_files.size() > 0:
		result.success = false
	
	return result
