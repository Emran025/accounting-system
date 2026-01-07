<?php
namespace App\Core;

class Validator {
    private $errors = [];

    public function validate(array $data, array $rules) {
        foreach ($rules as $field => $ruleString) {
            $rulesArray = explode('|', $ruleString);
            foreach ($rulesArray as $rule) {
                $this->applyRule($data, $field, $rule);
            }
        }
        return empty($this->errors);
    }

    private function applyRule($data, $field, $rule) {
        $value = $data[$field] ?? null;

        if ($rule === 'required' && empty($value)) {
            $this->addError($field, "$field is required");
        }
        
        if ($rule === 'numeric' && !is_numeric($value) && !empty($value)) {
            $this->addError($field, "$field must be numeric");
        }

        // Add more rules as needed (email, min, max, etc.)
    }

    private function addError($field, $message) {
        $this->errors[$field][] = $message;
    }

    public function getErrors() {
        return $this->errors;
    }
}
