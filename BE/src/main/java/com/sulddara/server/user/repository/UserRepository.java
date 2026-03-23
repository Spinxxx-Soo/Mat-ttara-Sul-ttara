package com.sulddara.server.user.repository;

import com.sulddara.server.user.domain.UserEntity;
import com.sulddara.server.user.domain.enums.SocialType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, Long> {
    Optional<UserEntity> findByProviderAndProviderId(SocialType provider, String providerId);
}
