package com.cloudnative.tasks.service;

import com.cloudnative.tasks.api.TaskRequest;
import com.cloudnative.tasks.api.TaskResponse;
import com.cloudnative.tasks.model.Task;
import com.cloudnative.tasks.model.TaskPriority;
import com.cloudnative.tasks.model.TaskStatus;
import com.cloudnative.tasks.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class TaskService {

    private final TaskRepository taskRepository;

    public TaskService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> findAll() {
        return taskRepository.findAllByOrderByUpdatedAtDesc()
                .stream()
                .map(TaskResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public TaskResponse findById(Long id) {
        return TaskResponse.from(getTask(id));
    }

    public TaskResponse create(TaskRequest request) {
        Task task = new Task(
                request.title().trim(),
                request.description(),
                request.status() == null ? TaskStatus.TODO : request.status(),
                request.priority() == null ? TaskPriority.NORMAL : request.priority(),
                request.dueDate()
        );
        return TaskResponse.from(taskRepository.save(task));
    }

    public TaskResponse update(Long id, TaskRequest request) {
        Task task = getTask(id);
        task.update(
                request.title().trim(),
                request.description(),
                request.status() == null ? task.getStatus() : request.status(),
                request.priority() == null ? task.getPriority() : request.priority(),
                request.dueDate()
        );
        return TaskResponse.from(taskRepository.save(task));
    }

    public void delete(Long id) {
        taskRepository.delete(getTask(id));
    }

    private Task getTask(Long id) {
        return taskRepository.findById(id).orElseThrow(() -> new TaskNotFoundException(id));
    }
}
