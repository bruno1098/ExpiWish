import json

def convert_to_messages_format(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8') as f_in, \
         open(output_file, 'w', encoding='utf-8') as f_out:
        
        for line in f_in:
            old_format = json.loads(line.strip())
            
            new_format = {
                "messages": [
                    {"role": "user", "content": old_format["prompt"]},
                    {"role": "assistant", "content": old_format["completion"]}
                ]
            }
            
            f_out.write(json.dumps(new_format, ensure_ascii=False) + '\n')

# Converter os arquivos
convert_to_messages_format('train_balanced.jsonl', 'train_balanced_new.jsonl')
convert_to_messages_format('valid_balanced.jsonl', 'valid_balanced_new.jsonl')