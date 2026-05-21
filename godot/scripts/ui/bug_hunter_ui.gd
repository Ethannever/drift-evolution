# Bug 猎人 UI - v1.1
# 玩家报告 Bug 和查看奖励的界面

extends Control

@onready var bug_panel: PanelContainer = $BugPanel
@onready var rewards_label: Label = $BugPanel/VBox/RewardsLabel
@onready var bug_list: VBoxContainer = $BugPanel/VBox/ScrollContainer/BugList
@onready var report_button: Button = $BugPanel/VBox/ReportButton
@onready var stats_label: Label = $BugPanel/VBox/StatsLabel

var _bug_hunter = null
var _task_manager = null


func _ready():
	_bug_hunter = get_node_or_null("/root/BugHunterSystem")
	_task_manager = get_node_or_null("/root/TestTaskManager")
	
	report_button.pressed.connect(_on_report_pressed)
	
	# 定时刷新
	var timer = Timer.new()
	timer.wait_time = 5.0
	timer.timeout.connect(_refresh_display)
	add_child(timer)
	timer.start()
	
	_refresh_display()


func _refresh_display():
	if not _bug_hunter:
		return
	
	# 更新奖励显示
	var rewards = _bug_hunter.get_player_rewards()
	rewards_label.text = "🏆 科技点: %d" % rewards.get("total_points", 0)
	
	# 更新统计
	var stats = _bug_hunter.get_test_stats()
	stats_label.text = "已发现 Bug: %d | 已修复: %d | 待验证: %d" % [
		stats.open_bugs,
		stats.fixed_bugs,
		stats.verified_bugs
	]
	
	# 更新 Bug 列表
	_update_bug_list()


func _update_bug_list():
	# 清空现有列表
	for child in bug_list.get_children():
		child.queue_free()
	
	if not _bug_hunter:
		return
	
	# 显示最近的 Bugs
	var bugs = _bug_hunter.get_all_bugs()
	var bug_ids = bugs.keys()
	bug_ids.sort_custom(func(a, b): return bugs[b].get("reported_at", "") < bugs[a].get("reported_at", ""))
	
	for bug_id in bug_ids.slice(0, 9):  # 最多显示10个
		var bug = bugs[bug_id]
		var bug_item = _create_bug_item(bug)
		bug_list.add_child(bug_item)


func _create_bug_item(bug: Dictionary) -> HBoxContainer:
	var container = HBoxContainer.new()
	
	# 状态图标
	var status_label = Label.new()
	var status_icons = {
		"open": "🔴",
		"in_progress": "🟡",
		"fixed": "🔵",
		"verified": "✅",
		"closed": "⚫"
	}
	status_label.text = status_icons.get(bug.get("status", "open"), "⚪")
	container.add_child(status_label)
	
	# Bug 标题
	var title_label = Label.new()
	title_label.text = bug.get("title", "未命名Bug")
	title_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	container.add_child(title_label)
	
	# 严重程度
	var severity_label = Label.new()
	var severity_colors = {
		"low": "🟢",
		"medium": "🟡",
		"high": "🟠",
		"critical": "🔴"
	}
	severity_label.text = severity_colors.get(bug.get("severity", "medium"), "⚪")
	container.add_child(severity_label)
	
	return container


func _on_report_pressed():
	# 打开报告对话框（简单版本：使用输入对话框）
	_show_simple_report_dialog()


func _show_simple_report_dialog():
	var dialog = ConfirmationDialog.new()
	dialog.title = "报告 Bug"
	dialog.dialog_text = "感谢你帮助改进游戏！\n\n请描述你发现的问题："
	dialog.ok_button_text = "发送"
	dialog.cancel_button_text = "取消"
	
	var input = LineEdit.new()
	input.placeholder_text = "简要描述 Bug..."
	input.size = Vector2(400, 100)
	
	dialog.add_child(input)
	add_child(dialog)
	
	dialog.confirmed.connect(func(): _submit_bug_report(input.text))
	dialog.canceled.connect(func(): dialog.queue_free())
	
	dialog.popup_centered()


func _submit_bug_report(description: String):
	if description.strip_edges() == "":
		return
	
	if _bug_hunter:
		var result = _bug_hunter.report_bug({
			"title": description.substr(0, min(50, description.length())),
			"description": description,
			"severity": "medium",
			"reproducible": true
		})
		
		# 显示结果
		var message = Label.new()
		message.text = result.get("message", "已提交！")
		message.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		add_child(message)
		
		var tween = create_tween()
		tween.tween_property(message, "modulate:a", 0.0, 2.0)
		tween.chain().on_finished(func(): message.queue_free())
	
	_refresh_display()


func toggle_panel():
	bug_panel.visible = not bug_panel.visible
	if bug_panel.visible:
		_refresh_display()
