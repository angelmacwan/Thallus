#!/usr/bin/env python3
"""Test robust file ingestion with various edge cases"""

import os
import sys
import tempfile
import json

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.text_processor import TextProcessor
from core.graph_memory import LocalGraphMemory


def test_malformed_json_handling():
    """Test that ingestion handles malformed JSON gracefully"""
    print("=" * 60)
    print("TEST: Malformed JSON Handling")
    print("=" * 60)
    
    # Create a temporary graph storage
    with tempfile.TemporaryDirectory() as tmpdir:
        graph_path = os.path.join(tmpdir, "test_graph.json")
        graph = LocalGraphMemory(storage_path=graph_path)
        processor = TextProcessor(graph)
        
        # Test 1: Normal small text
        print("\n--- Test 1: Normal text ---")
        processor.ingest("John Smith works at Microsoft. Microsoft is a technology company.")
        
        # Test 2: Large text that might cause truncation
        print("\n--- Test 2: Large text (should truncate) ---")
        large_text = "Important information: " + ("Lorem ipsum dolor sit amet. " * 3000)
        processor.ingest(large_text)
        
        # Test 3: Text with special characters that might break JSON
        print("\n--- Test 3: Text with special characters ---")
        special_text = '''
        The company "Tech\'Corp" said: "We're #1!"
        Email: john@example.com
        Quote: "She said, \\"Hello\\""
        Newlines and tabs:\t\n\t\n
        '''
        processor.ingest(special_text)
        
        # Test 4: Empty/minimal text
        print("\n--- Test 4: Empty text ---")
        processor.ingest("")
        
        # Test 5: Create a test file with problematic encoding
        print("\n--- Test 5: File with mixed content ---")
        test_file = os.path.join(tmpdir, "test.txt")
        with open(test_file, 'w', encoding='utf-8') as f:
            f.write("Test file for ingestion.\n")
            f.write("Contains: John Doe at Apple Inc.\n")
            f.write("And: Jane Smith at Google LLC.\n")
        
        processor.ingest(test_file)
        
        # Check results
        print("\n" + "=" * 60)
        print("TEST RESULTS")
        print("=" * 60)
        print(f"✓ Total entities extracted: {len(graph.entities)}")
        print(f"✓ Total relations extracted: {len(graph.relations)}")
        print(f"✓ All ingestion attempts completed without crashes")
        
        if len(graph.entities) > 0:
            print(f"\nSample entities:")
            for name, data in list(graph.entities.items())[:5]:
                print(f"  - {name} ({data['type']})")
        
        return True


def test_corrupted_graph_recovery():
    """Test that corrupted graph.json doesn't crash the system"""
    print("\n" + "=" * 60)
    print("TEST: Corrupted Graph Recovery")
    print("=" * 60)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create a corrupted JSON file
        graph_path = os.path.join(tmpdir, "corrupted_graph.json")
        with open(graph_path, 'w') as f:
            f.write('{"entities": {"test": "incomplete string')  # Malformed JSON
        
        print("\n--- Loading corrupted graph ---")
        try:
            graph = LocalGraphMemory(storage_path=graph_path)
            print("✓ Graph loaded successfully despite corruption")
            print(f"  - Started with empty graph: {len(graph.entities)} entities")
            
            # Should have backed up the corrupted file
            backup_path = f"{graph_path}.corrupted"
            if os.path.exists(backup_path):
                print(f"✓ Corrupted file backed up to: {backup_path}")
            
            # Should be able to add new data
            graph.add_entity("Test Entity", "Test")
            print("✓ Can add new entities after recovery")
            
            return True
        except Exception as e:
            print(f"✗ Failed: {e}")
            return False


def test_folder_ingestion_resilience():
    """Test that folder ingestion continues even if individual files fail"""
    print("\n" + "=" * 60)
    print("TEST: Folder Ingestion Resilience")
    print("=" * 60)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        graph_path = os.path.join(tmpdir, "test_graph.json")
        graph = LocalGraphMemory(storage_path=graph_path)
        processor = TextProcessor(graph)
        
        # Create test folder with multiple files
        test_folder = os.path.join(tmpdir, "test_batch")
        os.makedirs(test_folder)
        
        # Good file 1
        with open(os.path.join(test_folder, "file1.txt"), 'w') as f:
            f.write("Alice works at TechCorp.")
        
        # Good file 2
        with open(os.path.join(test_folder, "file2.md"), 'w') as f:
            f.write("Bob manages SoftwareInc.")
        
        # Large file that might cause issues
        with open(os.path.join(test_folder, "file3.txt"), 'w') as f:
            f.write("Very large content: " + ("x" * 100000))
        
        print("\n--- Ingesting folder with multiple files ---")
        processor.ingest_folder(test_folder)
        
        print(f"\n✓ Folder ingestion completed")
        print(f"✓ Extracted {len(graph.entities)} entities total")
        
        return True


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("ROBUST INGESTION TEST SUITE")
    print("=" * 60)
    
    all_passed = True
    
    try:
        all_passed = test_malformed_json_handling() and all_passed
    except Exception as e:
        print(f"\n✗ Test 1 failed with exception: {e}")
        import traceback
        traceback.print_exc()
        all_passed = False
    
    try:
        all_passed = test_corrupted_graph_recovery() and all_passed
    except Exception as e:
        print(f"\n✗ Test 2 failed with exception: {e}")
        import traceback
        traceback.print_exc()
        all_passed = False
    
    try:
        all_passed = test_folder_ingestion_resilience() and all_passed
    except Exception as e:
        print(f"\n✗ Test 3 failed with exception: {e}")
        import traceback
        traceback.print_exc()
        all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✓✓✓ ALL TESTS PASSED ✓✓✓")
    else:
        print("✗✗✗ SOME TESTS FAILED ✗✗✗")
    print("=" * 60)
    
    sys.exit(0 if all_passed else 1)
