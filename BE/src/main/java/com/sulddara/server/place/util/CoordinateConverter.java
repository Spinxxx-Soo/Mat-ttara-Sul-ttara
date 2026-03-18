package com.sulddara.server.place.util;

import org.locationtech.proj4j.CRSFactory;
import org.locationtech.proj4j.CoordinateReferenceSystem;
import org.locationtech.proj4j.CoordinateTransform;
import org.locationtech.proj4j.CoordinateTransformFactory;
import org.locationtech.proj4j.ProjCoordinate;

public class CoordinateConverter {

    private static final CRSFactory CRS_FACTORY = new CRSFactory();
    private static final CoordinateTransformFactory TRANSFORM_FACTORY = new CoordinateTransformFactory();

    // Naver KATEC (TM128) -> +x_0=400000 +y_0=600000
    private static final String TM128_PROJ = "+proj=tmerc +lat_0=38 +lon_0=128 +k=0.9999 +x_0=400000 +y_0=600000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43";
    // WGS84
    private static final String WGS84_PROJ = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs";

    private static final CoordinateReferenceSystem TM128_CRS = CRS_FACTORY.createFromParameters("TM128", TM128_PROJ);
    private static final CoordinateReferenceSystem WGS84_CRS = CRS_FACTORY.createFromParameters("WGS84", WGS84_PROJ);
    
    // 멀티스레드 환경(비동기 로직 등)에서의 동시성 보장 및 완벽한 Thread-Safety를 위해 ThreadLocal 적용
    private static final ThreadLocal<CoordinateTransform> TRANSFORM_HOLDER = ThreadLocal.withInitial(() -> 
            TRANSFORM_FACTORY.createTransform(TM128_CRS, WGS84_CRS)
    );

    public static class LatLng {
        public final double lat;
        public final double lng;

        public LatLng(double lat, double lng) {
            this.lat = lat;
            this.lng = lng;
        }
    }

    public static LatLng convertTm128ToWgs84(double mapx, double mapy) {
        ProjCoordinate src = new ProjCoordinate(mapx, mapy);
        ProjCoordinate dest = new ProjCoordinate();
        TRANSFORM_HOLDER.get().transform(src, dest);
        
        // Dest X is Longitude, Y is Latitude
        return new LatLng(dest.y, dest.x);
    }
}
