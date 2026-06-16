package com.flashhook;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import static com.tngtech.archunit.library.Architectures.layeredArchitecture;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

@AnalyzeClasses(packages = "com.flashhook", importOptions = ImportOption.DoNotIncludeTests.class)
public class ArchUnitTest {

    @ArchTest
    static final ArchRule layerDependenciesAreRespected = layeredArchitecture()
            .consideringAllDependencies()
            .layer("Controller").definedBy("..controller..")
            .layer("Service").definedBy("..service..")
            .layer("Repository").definedBy("..repository..")
            .layer("Event").definedBy("..event..")
            .layer("Global").definedBy("..global..")
            .whereLayer("Controller").mayNotBeAccessedByAnyLayer()
            // We use event layer to handle domain isolation, and global has
            // config/exceptions
            .whereLayer("Service").mayOnlyBeAccessedByLayers("Controller", "Service", "Event", "Global")
            .whereLayer("Repository").mayOnlyBeAccessedByLayers("Service", "Event", "Global");

    @ArchTest
    static final ArchRule noCircularDependencies = slices()
            .matching("com.flashhook.domain.(*)..")
            .should().beFreeOfCycles();
}
