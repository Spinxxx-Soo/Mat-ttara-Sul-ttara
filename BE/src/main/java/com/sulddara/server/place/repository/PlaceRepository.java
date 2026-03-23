package com.sulddara.server.place.repository;

import com.sulddara.server.place.domain.Place;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlaceRepository extends JpaRepository<Place, Long> {
  @Query(value = "SELECT p.id FROM places p " +
          "WHERE ST_Distance_Sphere(point(p.lng, p.lat), point(:lng, :lat)) <= 1000 ", nativeQuery = true)
  List<Long> findIdsByLocation(@Param("lat") Double lat, @Param("lng") Double lng);

  Optional<Place> findByProviderAndExternalPlaceId(String provider, String externalPlaceId);
}
