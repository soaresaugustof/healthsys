package com.healthsys.notification.repository;

import com.healthsys.notification.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findAllByOrderByCriadaEmDesc();
    long countByLidaFalse();
}
