"""
AWS S3 Helper

Responsibilities
----------------
1. Download vendor documents from S3
2. Upload generated reports (future)
3. Generate pre-signed URLs (future)
"""

import os
from pathlib import Path
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from config import settings
from logger import logger


class S3Helper:

    def __init__(self):

        self.client = boto3.client(
            "s3",
            region_name=settings.AWS_REGION
        )

        self.bucket = settings.S3_BUCKET

    def download_file(
        self,
        object_key: str,
        download_dir: str = "downloads"
    ) -> str:
        """
        Downloads a file from S3.

        Returns
        -------
        Local file path
        """

        Path(download_dir).mkdir(
            parents=True,
            exist_ok=True
        )

        filename = os.path.basename(object_key)

        local_path = os.path.join(
            download_dir,
            filename
        )

        logger.info(f"Downloading {object_key}")

        self.client.download_file(
            self.bucket,
            object_key,
            local_path
        )

        logger.info(f"Downloaded to {local_path}")

        return local_path

    def upload_file(
        self,
        local_path: str,
        object_key: str
    ):

        logger.info("Uploading file to S3")

        self.client.upload_file(
            local_path,
            self.bucket,
            object_key
        )

        logger.info("Upload completed")

    def file_exists(
        self,
        object_key: str
    ) -> bool:

        try:

            self.client.head_object(
                Bucket=self.bucket,
                Key=object_key
            )

            return True

        except ClientError:

            return False

    def generate_presigned_url(
        self,
        object_key: str,
        expires: int = 3600
    ) -> Optional[str]:

        try:

            return self.client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": self.bucket,
                    "Key": object_key
                },
                ExpiresIn=expires
            )

        except Exception as ex:

            logger.exception(ex)

            return None