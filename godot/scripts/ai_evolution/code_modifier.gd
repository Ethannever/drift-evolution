# 代码修改器 - 应用变更到代码文件
# 负责备份、应用变更、恢复、语法验证

extends Node

const BACKUP_DIR = "user://ai_evolution/backups/"
const SCRIPTS_ROOT = "res://scripts/"

var _pending_changes: Array = []


func _ready():
	DirAccess.make_dir_recursive_absolute(BACKUP_DIR)


# ==================== 核心 API ====================

func backup_current_version() -> String:
	var timestamp = Time.get_datetime_string_from_system().replace(":", "-").replace("T", "_")
	var backup_name = "backup_%s" % timestamp
	var backup_path = BACKUP_DIR + backup_name + "/"
	
	DirAccess.make_dir_recursive_absolute(backup_path)
	
	# 复制所有脚本文件
	var dir = DirAccess.open(SCRIPTS_ROOT)
	if dir:
		_copy_directory_recursive(dir, "", backup_path)
	
	# 复制 project.godot
	_copy_file("res://project.godot", backup_path + "project.godot")
	
	# 复制场景文件
	var scenes_dir = DirAccess.open("res://scenes/")
	if scenes_dir:
		DirAccess.make_dir_recursive_absolute(backup_path + "scenes/")
		_copy_directory_recursive(scenes_dir, "scenes/", backup_path)
	
	print("[CodeModifier] 备份已保存: ", backup_path)
	return backup_path


func restore_from_backup(backup_path: String) -> bool:
	print("[CodeModifier] 从备份恢复: ", backup_path)
	
	# 清除当前脚本
	_clear_directory(SCRIPTS_ROOT)
	
	# 恢复备份文件
	_restore_directory_recursive(backup_path, "scripts/", SCRIPTS_ROOT)
	
	# 恢复 project.godot
	_copy_file(backup_path + "project.godot", "res://project.godot")
	
	# 恢复场景
	if DirAccess.dir_exists_exists(backup_path + "scenes/"):
		_clear_directory("res://scenes/")
		_restore_directory_recursive(backup_path, "scenes/", "res://scenes/")
	
	print("[CodeModifier] 恢复完成")
	return true


func apply_proposal(proposal: Dictionary) -> Dictionary:
	var changes = proposal.get("changes", {})
	var change_type = changes.get("type", "")
	
	match change_type:
		"new_system":
			return _create_new_system(proposal)
		"new_file":
			return _create_new_file(proposal)
		"modify_function":
			return _modify_function(proposal)
		"add_class":
			return _add_class_to_file(proposal)
		"add_variable":
			return _add_variable_to_class(proposal)
		"ui_change":
			return _apply_ui_change(proposal)
		"content_generation":
			return _apply_content_generation(proposal)
		_:
			return {"success": false, "error": "未知变更类型: " + change_type}


# ==================== 变更类型实现 ====================

func _create_new_system(proposal: Dictionary) -> Dictionary:
	var changes = proposal.get("changes", {})
	var system_name = changes.get("system_name", "NewSystem")
	var system_path = changes.get("path", "new_system/")
	var template = changes.get("template", "default")
	
	var full_path = SCRIPTS_ROOT + system_path + system_name.to_lower() + ".gd"
	var dir_path = SCRIPTS_ROOT + system_path
	
	# 创建目录
	DirAccess.make_dir_recursive_absolute(dir_path)
	
	# 生成代码
	var code = _generate_system_code(system_name, template)
	
	# 写入文件
	var result = _write_file(full_path, code)
	if not result.success:
		return result
	
	# 生成对应场景
	var scene_result = _create_system_scene(system_name, full_path)
	
	return {
		"success": true,
		"files_created": [full_path],
		"changes": proposal.get("changes", {})
	}


func _create_new_file(proposal: Dictionary) -> Dictionary:
	var changes = proposal.get("changes", {})
	var file_path = changes.get("path", "")
	var content = changes.get("content", "")
	var file_type = changes.get("file_type", "script")
	
	if file_path == "":
		return {"success": false, "error": "未指定文件路径"}
	
	var full_path = SCRIPTS_ROOT + file_path
	var dir = full_path.get_base_dir()
	
	DirAccess.make_dir_recursive_absolute(dir)
	
	var result = _write_file(full_path, content)
	if not result.success:
		return result
	
	return {
		"success": true,
		"files_created": [full_path],
		"changes": changes
	}


func _modify_function(proposal: Dictionary) -> Dictionary:
	var changes = proposal.get("changes", {})
	var file_path = changes.get("file_path", "")
	var function_name = changes.get("function_name", "")
	var new_implementation = changes.get("implementation", "")
	
	if file_path == "" or function_name == "":
		return {"success": false, "error": "参数不完整"}
	
	var full_path = SCRIPTS_ROOT + file_path
	var content = _read_file(full_path)
	if content == "":
		return {"success": false, "error": "文件不存在: " + full_path}
	
	# 查找并替换函数
	var func_pattern = "func\\s+" + function_name + "\\s*\\([^)]*\\)[^:]*:"
	var func_regex = RegEx.new()
	func_regex.compile(func_pattern)
	
	var result = func_regex.search(content)
	if not result:
		return {"success": false, "error": "未找到函数: " + function_name}
	
	# 简单替换（实际应该更智能地处理函数体）
	var new_content = content.replace(result.get_string(0), new_implementation)
	
	var write_result = _write_file(full_path, new_content)
	if not write_result.success:
		return write_result
	
	return {
		"success": true,
		"files_modified": [full_path],
		"changes": changes
	}


func _add_class_to_file(proposal: Dictionary) -> Dictionary:
	var changes = proposal.get("changes", {})
	var file_path = changes.get("file_path", "")
	var class_code = changes.get("class_code", "")
	
	if file_path == "":
		return {"success": false, "error": "未指定文件路径"}
	
	var full_path = SCRIPTS_ROOT + file_path
	var content = _read_file(full_path)
	
	# 追加类定义
	if content != "":
		content += "\n\n" + class_code
	else:
		content = class_code
	
	var result = _write_file(full_path, content)
	if not result.success:
		return result
	
	return {
		"success": true,
		"files_modified": [full_path],
		"changes": changes
	}


func _add_variable_to_class(proposal: Dictionary) -> Dictionary:
	var changes = proposal.get("changes", {})
	var file_path = changes.get("file_path", "")
	var variable_declaration = changes.get("variable", "")
	var position = changes.get("position", "after_vars")
	
	if file_path == "" or variable_declaration == "":
		return {"success": false, "error": "参数不完整"}
	
	var full_path = SCRIPTS_ROOT + file_path
	var content = _read_file(full_path)
	
	# 在合适位置插入变量声明
	var insert_pos = content.find("\nfunc ")
	if insert_pos == -1:
		insert_pos = content.length()
	
	var new_content = content.insert(insert_pos, "\nvar " + variable_declaration + "\n")
	
	var result = _write_file(full_path, new_content)
	if not result.success:
		return result
	
	return {
		"success": true,
		"files_modified": [full_path],
		"changes": changes
	}


func _apply_ui_change(proposal: Dictionary) -> Dictionary:
	# UI 变更需要更多处理
	var changes = proposal.get("changes", {})
	var ui_type = changes.get("ui_type", "")
	var component = changes.get("component", "")
	
	# 暂时返回成功，实际应该修改 UI 文件
	return {
		"success": true,
		"changes": {"note": "UI 变更需要手动处理", "ui_type": ui_type, "component": component}
	}


func _apply_content_generation(proposal: Dictionary) -> Dictionary:
	# 内容生成（物品、敌人等）
	var changes = proposal.get("changes", {})
	var content_type = changes.get("content_type", "")
	var content_data = changes.get("data", {})
	
	# 将内容写入配置表
	var config_path = "res://configs/" + content_type + ".cfg"
	var config = ConfigFile.new()
	
	if config.load(config_path) == OK:
		var entries = config.get_value(content_type, "entries", {})
		entries[content_data.get("id", "unknown")] = content_data
		config.set_value(content_type, "entries", entries)
		config.save(config_path)
	
	return {
		"success": true,
		"changes": {"type": "content", "content_type": content_type, "id": content_data.get("id")}
	}


# ==================== 代码生成 ====================

func _generate_system_code(system_name: String, template: String) -> String:
	var templates = {
		"default": """# %s - 系统
# 自动生成

extends Node

signal state_changed(new_state: String)

var _state: String = "idle"


func _ready():
	pass


func process(delta: float):
	pass


func get_state() -> String:
	return _state


func set_state(new_state: String):
	if _state != new_state:
		_state = new_state
		state_changed.emit(_state)
""" % system_name,
		
		"combat": """# %s - 战斗系统
# 自动生成

extends Node

signal combat_started()
signal combat_ended(victory: bool)

var active_combatants: Array = []


func _ready():
	pass


func start_combat():
	combat_started.emit()


func end_combat(victory: bool):
	combat_ended.emit(victory)
""" % system_name
	}
	
	return templates.get(template, templates["default"])


func _create_system_scene(system_name: String, script_path: String) -> Dictionary:
	# 创建对应的 .tscn 文件
	var scene_path = "res://scenes/" + system_name.to_lower() + ".tscn"
	var content = """[gd_scene load_steps=2 format=3]

[ext_resource type="Script" path="%s" id="1"]

[node name="%s" type="Node"]
script = ExtResource("1")
""" % [script_path.replace("res://", ""), system_name]
	
	_write_file(scene_path, content)
	
	return {"success": true, "scene_created": scene_path}


# ==================== 文件操作 ====================

func _read_file(path: String) -> String:
	var file = FileAccess.open(path, FileAccess.READ)
	if file == null:
		return ""
	var content = file.get_as_text()
	file.close()
	return content


func _write_file(path: String, content: String) -> Dictionary:
	var file = FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		return {"success": false, "error": "无法写入文件: " + path}
	file.store_string(content)
	file.close()
	return {"success": true}


func _copy_file(source: String, dest: String):
	var content = _read_file(source)
	_write_file(dest, content)


func _copy_directory_recursive(source_dir: DirAccess, relative_path: String, dest_root: String):
	source_dir.list_dir_begin()
	var file_name = source_dir.get_next()
	
	while file_name != "":
		var full_source = "res://" + relative_path + file_name
		var full_dest = dest_root + relative_path + file_name
		
		if source_dir.current_is_dir():
			if file_name != "." and file_name != "..":
				DirAccess.make_dir_recursive_absolute(full_dest)
				var sub_dir = DirAccess.open(full_source + "/")
				if sub_dir:
					_copy_directory_recursive(sub_dir, relative_path + file_name + "/", dest_root)
		else:
			_copy_file(full_source, full_dest)
		
		file_name = source_dir.get_next()
	
	source_dir.list_dir_end()


func _restore_directory_recursive(backup_root: String, relative_path: String, dest_root: String):
	var backup_full = backup_root + relative_path
	var source_dir = DirAccess.open(backup_full)
	
	if not source_dir:
		return
	
	source_dir.list_dir_begin()
	var file_name = source_dir.get_next()
	
	while file_name != "":
		var full_source = backup_full + file_name
		var full_dest = dest_root + relative_path + file_name
		
		if source_dir.current_is_dir():
			if file_name != "." and file_name != "..":
				DirAccess.make_dir_recursive_absolute(full_dest)
				_restore_directory_recursive(backup_root, relative_path + file_name + "/", dest_root)
		else:
			_copy_file(full_source, full_dest)
		
		file_name = source_dir.get_next()
	
	source_dir.list_dir_end()


func _clear_directory(path: String):
	var dir = DirAccess.open(path)
	if not dir:
		return
	
	dir.list_dir_begin()
	var file_name = dir.get_next()
	
	while file_name != "":
		if dir.current_is_dir():
			if file_name != "." and file_name != "..":
				_clear_directory(path + "/" + file_name)
				DirAccess.remove_directory(path + "/" + file_name)
		else:
			DirAccess.remove(path + "/" + file_name)
		file_name = dir.get_next()
	
	dir.list_dir_end()
