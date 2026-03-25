package com.sulddara.server.place.repository;

import com.sulddara.server.place.domain.PlaceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlaceRepository extends JpaRepository<PlaceEntity, Long> {
  @Query(value = "SELECT p.id FROM places p " +
          "WHERE ST_Distance_Sphere(point(p.lng, p.lat), point(:lng, :lat)) <= 1000 ", nativeQuery = true)
  List<Long> findIdsByLocation(@Param("lat") Double lat, @Param("lng") Double lng);

  Optional<PlaceEntity> findByProviderAndExternalPlaceId(String provider, String externalPlaceId);

  @Query("SELECT COALESCE(AVG(r.rating), 0.0) FROM ReviewEntity r WHERE r.place.id = :placeId")
  Double getAverageRatingByPlaceId(@Param("placeId") Long placeId);
}
