# 场景过渡效果
# 用于主菜单和游戏世界之间的淡入淡出

extends CanvasLayer

signal transition_complete

var _is_transitioning: bool = false


func fade_to_scene(scene_path: String):
	if _is_transitioning:
		return
	
	_is_transitioning = true
	
	var tween = create_tween()
	tween.tween_property($ColorRect, "color:a", 1.0, 0.5)
	await tween.finished
	
	get_tree().change_scene_to_file(scene_path)
	
	# 淡出
	var tween2 = create_tween()
	tween2.tween_property($ColorRect, "color:a", 0.0, 0.5)
	await tween2.finished
	
	_is_transitioning = false
	transition_complete.emit()
