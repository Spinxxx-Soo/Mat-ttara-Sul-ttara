package com.sulddara.server.s3.service;

import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.ObjectMetadata;
import com.amazonaws.services.s3.model.PutObjectRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.net.URL;
import java.net.URLConnection;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class S3Service {

    private final AmazonS3 amazonS3;

    @Value("${spring.cloud.aws.s3.bucket}")
    private String bucket;

    public String uploadFromExternalUrl(String externalUrl) {
        String fileName = "places/" + UUID.randomUUID() + ".jpg";

        try {
            URLConnection connection = new URL(externalUrl).openConnection();
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(5000);

            try (InputStream inputStream = connection.getInputStream()) {
                ObjectMetadata metadata = new ObjectMetadata();
                metadata.setContentType("image/jpeg");

                long contentLength = connection.getContentLengthLong();
                if (contentLength > 0) {
                    metadata.setContentLength(contentLength);
                }

                amazonS3.putObject(new PutObjectRequest(bucket, fileName, inputStream, metadata));
                return amazonS3.getUrl(bucket, fileName).toString();
            }
        } catch (Exception e) {
            log.error("S3 외부 이미지 업로드 실패: {}", e.getMessage());
            return null;
        }
    }
}
