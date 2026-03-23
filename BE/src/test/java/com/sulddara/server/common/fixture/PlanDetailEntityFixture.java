package com.sulddara.server.common.fixture;

import com.sulddara.server.place.domain.PlaceEntity;
import com.sulddara.server.plan.domain.PlanDetailEntity;
import org.springframework.test.util.ReflectionTestUtils;

public class PlanDetailEntityFixture {

    public static PlanDetailEntity createDefaultDetail(PlaceEntity place) {
        return new PlanDetailEntity(place, 1, "추천 이유");
    }

    public static PlanDetailEntity createDetailWithId(Long id, PlaceEntity place) {
        PlanDetailEntity detail = createDefaultDetail(place);
        ReflectionTestUtils.setField(detail, "id", id);
        return detail;
    }
}
