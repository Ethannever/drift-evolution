# 代码分析器 - 读取并分析游戏代码结构
# 提取：文件结构、类定义、函数列表、变量定义、依赖关系

extends Node

const GAME_ROOT = "res://"
const SCRIPTS_DIR = "res://scripts/"

var _code_cache: Dictionary = {}
var _structure_cache: Dictionary = {}


func _ready():
	clear_cache()


func clear_cache():
	_code_cache.clear()
	_structure_cache.clear()


# ==================== 核心分析 ====================

func analyze_current_state() -> Dictionary:
	return {
		"file_structure": _analyze_file_structure(),
		"class_definitions": _analyze_classes(),
		"function_signatures": _analyze_functions(),
		"global_variables": _analyze_global_variables(),
		"dependencies": _analyze_dependencies(),
		"code_metrics": _calculate_metrics(),
		"gameplay_systems": _identify_gameplay_systems()
	}


func _analyze_file_structure() -> Dictionary:
	var structure = {
		"total_files": 0,
		"scripts": [],
		"scenes": [],
		"configs": [],
		"resources": [],
		"directories": []
	}
	
	var dir = DirAccess.open(GAME_ROOT)
	if dir:
		_scan_directory_recursive(dir, "", structure)
	
	return structure


func _scan_directory_recursive(dir: DirAccess, relative_path: String, structure: Dictionary):
	dir.list_dir_begin()
	var file_name = dir.get_next()
	
	while file_name != "":
		if dir.current_is_dir():
			if file_name != "." and file_name != ".." and file_name != "ai_evolution":
				structure.directories.append(relative_path + file_name)
				var sub_dir = DirAccess.open(GAME_ROOT + relative_path + file_name + "/")
				if sub_dir:
					_scan_directory_recursive(sub_dir, relative_path + file_name + "/", structure)
		else:
			structure.total_files += 1
			if file_name.ends_with(".gd"):
				structure.scripts.append(relative_path + file_name)
			elif file_name.ends_with(".tscn"):
				structure.scenes.append(relative_path + file_name)
			elif file_name.ends_with(".cfg") or file_name.ends_with(".ini"):
				structure.configs.append(relative_path + file_name)
			elif file_name.ends_with(".tres") or file_name.ends_with(".import"):
				structure.resources.append(relative_path + file_name)
		
		file_name = dir.get_next()
	
	dir.list_dir_end()


func _analyze_classes() -> Array:
	var classes = []
	var dir = DirAccess.open(SCRIPTS_DIR)
	
	if not dir:
		return classes
	
	_scan_for_classes(dir, "", classes)
	return classes


func _scan_for_classes(dir: DirAccess, relative_path: String, classes: Array):
	dir.list_dir_begin()
	var file_name = dir.get_next()
	
	while file_name != "":
		var full_path = SCRIPTS_DIR + relative_path + file_name
		
		if dir.current_is_dir():
			if file_name != "." and file_name != "..":
				var sub_dir = DirAccess.open(full_path + "/")
				if sub_dir:
					_scan_for_classes(sub_dir, relative_path + file_name + "/", classes)
		elif file_name.ends_with(".gd"):
			var class_info = _parse_class_from_file(full_path)
			if class_info:
				classes.append(class_info)
		
		file_name = dir.get_next()
	
	dir.list_dir_end()


func _parse_class_from_file(file_path: String) -> Dictionary:
	var content = _read_file_content(file_path)
	if content == "":
		return {}
	
	var class_info = {
		"path": file_path,
		"name": "",
		"extends": "",
		"signals": [],
		"functions": [],
		"variables": [],
		"line_count": content.split("\n").size()
	}
	
	# 解析 class_name
	var class_name_match = RegEx.new()
	class_name_match.compile("class_name\\s+(\\w+)")
	var result = class_name_match.search(content)
	if result:
		class_info.name = result.get_string(1)
	
	# 解析 extends
	var extends_match = RegEx.new()
	extends_match.compile("extends\\s+([\\w.]+)")
	result = extends_match.search(content)
	if result:
		class_info.extends = result.get_string(1)
	
	# 解析 signals
	var signal_match = RegEx.new()
	signal_match.compile("signal\\s+(\\w+)")
	for m in signal_match.search_all(content):
		class_info.signals.append(m.get_string(1))
	
	# 解析 functions
	var func_match = RegEx.new()
	func_match.compile("func\\s+(\\w+)\\s*\\(")
	for m in func_match.search_all(content):
		class_info.functions.append(m.get_string(1))
	
	# 解析 variables (@export, var)
	var var_match = RegEx.new()
	var_match.compile("(?:@export\\s+)?var\\s+(\\w+)")
	for m in var_match.search_all(content):
		class_info.variables.append(m.get_string(1))
	
	return class_info


func _analyze_functions() -> Array:
	var all_functions = []
	var classes = _analyze_classes()
	
	for cls in classes:
		for func_name in cls.functions:
			all_functions.append({
				"class": cls.name,
				"path": cls.path,
				"name": func_name
			})
	
	return all_functions


func _analyze_global_variables() -> Array:
	# 查找 autoload 脚本中的全局变量
	var globals = []
	
	var project = ConfigFile.new()
	if project.load("res://project.godot") == OK:
		var sections = project.get_sections()
		for section in sections:
			if section.begins_with("autoload"):
				var autoload_name = section.replace("autoload/", "")
				var autoload_path = project.get_value(section, "", "")
				globals.append({
					"name": autoload_name,
					"path": autoload_path
				})
	
	return globals


func _analyze_dependencies() -> Dictionary:
	var deps = {}
	var classes = _analyze_classes()
	
	for cls in classes:
		if cls.extends and cls.extends != "" and cls.extends != "Node":
			if not deps.has(cls.extends):
				deps[cls.extends] = []
			deps[cls.extends].append(cls.name)
	
	return deps


func _calculate_metrics() -> Dictionary:
	var classes = _analyze_classes()
	var total_lines = 0
	var total_functions = 0
	
	for cls in classes:
		total_lines += cls.line_count
		total_functions += cls.functions.size()
	
	return {
		"total_scripts": classes.size(),
		"total_lines": total_lines,
		"total_functions": total_functions,
		"avg_lines_per_script": int(total_lines / max(1, classes.size())),
		"total_signals": classes.reduce(func(acc, c): return acc + c.signals.size(), 0)
	}


func _identify_gameplay_systems() -> Array:
	# 根据目录/文件结构识别游戏系统
	var systems = []
	var dir = DirAccess.open(SCRIPTS_DIR)
	
	if dir:
		dir.list_dir_begin()
		var folder = dir.get_next()
		while folder != "":
			if dir.current_is_dir() and folder != "." and folder != "..":
				systems.append(folder)
			folder = dir.get_next()
		dir.list_dir_end()
	
	return systems


# ==================== 文件操作 ====================

func _read_file_content(file_path: String) -> String:
	if _code_cache.has(file_path):
		return _code_cache[file_path]
	
	var file = FileAccess.open(file_path, FileAccess.READ)
	if file == null:
		return ""
	
	var content = file.get_as_text()
	file.close()
	_code_cache[file_path] = content
	return content


func get_file_content(file_path: String) -> String:
	return _read_file_content(file_path)


func get_all_script_paths() -> Array:
	var structure = _analyze_file_structure()
	return structure.scripts
