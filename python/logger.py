from loguru import logger
import sys

logger.remove()

logger.add(
    sys.stdout,
    colorize=True,
    backtrace=True,
    diagnose=True,
    enqueue=True,
    level="INFO",
    format="{time} | {level} | {message}"
)

logger.add(
    "logs/vendor_ai.log",
    rotation="10 MB",
    retention="30 days",
    compression="zip",
    enqueue=True
)