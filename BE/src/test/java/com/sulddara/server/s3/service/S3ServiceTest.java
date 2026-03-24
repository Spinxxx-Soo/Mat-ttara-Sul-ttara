package com.sulddara.server.s3.service;

import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.PutObjectRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.net.URL;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class S3ServiceTest {

    @Mock
    private AmazonS3 amazonS3;

    @InjectMocks
    private S3Service s3Service;

    private final String bucket = "test-bucket";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(s3Service, "bucket", bucket);
    }

    @Test
    @DisplayName("외부 URL 이미지를 S3에 성공적으로 업로드한다")
    void uploadFromExternalUrl_Success() throws Exception {
        // given
        String externalUrl = "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png";
        String expectedS3Url = "https://test-bucket.s3.amazonaws.com/places/uuid-test.jpg";

        // amazonS3.getUrl()이 호출될 때 가짜 URL을 반환하도록 설정
        given(amazonS3.getUrl(eq(bucket), anyString())).willReturn(new URL(expectedS3Url));

        // when
        String resultUrl = s3Service.uploadFromExternalUrl(externalUrl);

        // then
        assertThat(resultUrl).isEqualTo(expectedS3Url);
        // 실제로 S3에 putObject 요청이 한 번 갔는지 검증
        verify(amazonS3, times(1)).putObject(any(PutObjectRequest.class));
    }

    @Test
    @DisplayName("잘못된 URL이 들어오면 null을 반환한다")
    void uploadFromExternalUrl_Fail() {
        // given
        String invalidUrl = "http://invalid-url-that-does-not-exist.com/test.jpg";

        // when
        String resultUrl = s3Service.uploadFromExternalUrl(invalidUrl);

        // then
        assertThat(resultUrl).isNull();
    }
}