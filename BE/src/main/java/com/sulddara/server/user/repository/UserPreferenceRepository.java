package com.sulddara.server.user.repository;

import com.sulddara.server.user.domain.UserPreferenceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserPreferenceRepository extends JpaRepository<UserPreferenceEntity, Long> {
    @Query("SELECT up FROM UserPreferenceEntity up JOIN FETCH up.user WHERE up.user.id = :userId")
    Optional<UserPreferenceEntity> findByUserIdWithUser(@Param("userId") Long userId);
}
