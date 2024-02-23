import base64 

sample_string = "124542442327-5u8cd7ee4pdnf3slache1paud4g0gc0c.apps.googleusercontent.com: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"
sample_string_bytes = sample_string.encode("ascii") 

base64_bytes = base64.b64encode(sample_string_bytes) 
base64_string = base64_bytes.decode("ascii") 

print(f"Encoded string: {base64_string}") 