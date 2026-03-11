package com.sulddara.server.place.repository;

import com.sulddara.server.place.domain.Place;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PlaceRepository extends JpaRepository<Place, Long> {
  Optional<Place> findByProviderAndExternalPlaceId(String provider, String externalPlaceId);
}
