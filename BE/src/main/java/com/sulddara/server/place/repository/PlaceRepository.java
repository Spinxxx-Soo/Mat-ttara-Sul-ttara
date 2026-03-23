package com.sulddara.server.place.repository;

import com.sulddara.server.place.domain.PlaceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PlaceRepository extends JpaRepository<PlaceEntity, Long> {
  Optional<PlaceEntity> findByProviderAndExternalPlaceId(String provider, String externalPlaceId);
}
